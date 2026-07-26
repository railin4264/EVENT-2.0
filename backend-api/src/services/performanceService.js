/**
 * Performance Monitoring Service for EventConnect 2.0
 * Tracks and optimizes application performance
 */

const os = require('os');
const v8 = require('v8');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

class PerformanceService {
  constructor() {
    this.metrics = {
      requests: new Map(),
      database: new Map(),
      cache: new Map(),
      memory: [],
      cpu: [],
      errors: new Map()
    };

    this.thresholds = {
      responseTime: {
        warning: 1000, // 1 second
        critical: 3000 // 3 seconds
      },
      memoryUsage: {
        warning: 0.8, // 80%
        critical: 0.9 // 90%
      },
      cpuUsage: {
        warning: 0.7, // 70%
        critical: 0.9 // 90%
      },
      errorRate: {
        warning: 0.05, // 5%
        critical: 0.1 // 10%
      }
    };

    this.startSystemMonitoring();
  }

  /**
   * Start system resource monitoring
   */
  startSystemMonitoring() {
    // Monitor system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Clean old metrics every hour
    setInterval(() => {
      this.cleanOldMetrics();
    }, 3600000);
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics() {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = os.loadavg();
      const systemMemory = {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      };

      const timestamp = Date.now();

      // Store memory metrics
      this.metrics.memory.push({
        timestamp,
        heap: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
        },
        system: {
          used: systemMemory.used,
          total: systemMemory.total,
          percentage: (systemMemory.used / systemMemory.total) * 100
        },
        external: memoryUsage.external,
        rss: memoryUsage.rss
      });

      // Store CPU metrics
      this.metrics.cpu.push({
        timestamp,
        loadAverage: {
          oneMinute: cpuUsage[0],
          fiveMinutes: cpuUsage[1],
          fifteenMinutes: cpuUsage[2]
        },
        cpuCount: os.cpus().length
      });

      // Keep only last 100 entries
      if (this.metrics.memory.length > 100) {
        this.metrics.memory = this.metrics.memory.slice(-100);
      }
      if (this.metrics.cpu.length > 100) {
        this.metrics.cpu = this.metrics.cpu.slice(-100);
      }

      // Check thresholds and alert if necessary
      await this.checkThresholds();

      // Cache metrics for external access
      await this.cacheMetrics();
    } catch (error) {
      logger.error('Error collecting system metrics:', error);
    }
  }

  /**
   * Track HTTP request performance
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {number} startTime - Request start time
   */
  trackRequest(req, res, startTime) {
    try {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const endpoint = `${req.method} ${req.route?.path || req.path}`;

      if (!this.metrics.requests.has(endpoint)) {
        this.metrics.requests.set(endpoint, {
          count: 0,
          totalTime: 0,
          avgTime: 0,
          minTime: Infinity,
          maxTime: 0,
          errors: 0,
          statusCodes: new Map()
        });
      }

      const metrics = this.metrics.requests.get(endpoint);
      metrics.count++;
      metrics.totalTime += duration;
      metrics.avgTime = metrics.totalTime / metrics.count;
      metrics.minTime = Math.min(metrics.minTime, duration);
      metrics.maxTime = Math.max(metrics.maxTime, duration);

      // Track status codes
      const statusCode = res.statusCode;
      metrics.statusCodes.set(statusCode, (metrics.statusCodes.get(statusCode) || 0) + 1);

      // Track errors
      if (statusCode >= 400) {
        metrics.errors++;
      }

      // Log slow requests
      if (duration > this.thresholds.responseTime.warning) {
        logger.warn(`Slow request detected: ${endpoint} took ${duration}ms`, {
          method: req.method,
          url: req.url,
          duration,
          statusCode,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
      }

      // Track performance in real-time cache
      this.updateRealTimeMetrics(endpoint, duration, statusCode);
    } catch (error) {
      logger.error('Error tracking request performance:', error);
    }
  }

  /**
   * Track database operation performance
   * @param {string} operation - Database operation name
   * @param {number} duration - Operation duration in ms
   * @param {boolean} success - Whether operation was successful
   */
  trackDatabaseOperation(operation, duration, success = true) {
    try {
      if (!this.metrics.database.has(operation)) {
        this.metrics.database.set(operation, {
          count: 0,
          totalTime: 0,
          avgTime: 0,
          minTime: Infinity,
          maxTime: 0,
          errors: 0,
          successRate: 100
        });
      }

      const metrics = this.metrics.database.get(operation);
      metrics.count++;
      metrics.totalTime += duration;
      metrics.avgTime = metrics.totalTime / metrics.count;
      metrics.minTime = Math.min(metrics.minTime, duration);
      metrics.maxTime = Math.max(metrics.maxTime, duration);

      if (!success) {
        metrics.errors++;
      }

      metrics.successRate = ((metrics.count - metrics.errors) / metrics.count) * 100;

      // Log slow database operations
      if (duration > 1000) { // 1 second
        logger.warn(`Slow database operation: ${operation} took ${duration}ms`);
      }
    } catch (error) {
      logger.error('Error tracking database operation:', error);
    }
  }

  /**
   * Track cache operation performance
   * @param {string} operation - Cache operation name
   * @param {boolean} hit - Whether it was a cache hit
   * @param {number} duration - Operation duration in ms
   */
  trackCacheOperation(operation, hit, duration = 0) {
    try {
      if (!this.metrics.cache.has(operation)) {
        this.metrics.cache.set(operation, {
          hits: 0,
          misses: 0,
          hitRate: 0,
          totalTime: 0,
          avgTime: 0
        });
      }

      const metrics = this.metrics.cache.get(operation);

      if (hit) {
        metrics.hits++;
      } else {
        metrics.misses++;
      }

      metrics.hitRate = (metrics.hits / (metrics.hits + metrics.misses)) * 100;
      metrics.totalTime += duration;
      metrics.avgTime = metrics.totalTime / (metrics.hits + metrics.misses);
    } catch (error) {
      logger.error('Error tracking cache operation:', error);
    }
  }

  /**
   * Update real-time metrics in cache
   * @param {string} endpoint - API endpoint
   * @param {number} duration - Request duration
   * @param {number} statusCode - HTTP status code
   */
  async updateRealTimeMetrics(endpoint, duration, statusCode) {
    try {
      const minute = Math.floor(Date.now() / 60000); // Current minute
      const key = `realtime_metrics:${minute}`;

      const currentMetrics = await cacheService.get(key, {
        requests: 0,
        errors: 0,
        totalTime: 0,
        endpoints: {}
      });

      currentMetrics.requests++;
      currentMetrics.totalTime += duration;

      if (statusCode >= 400) {
        currentMetrics.errors++;
      }

      if (!currentMetrics.endpoints[endpoint]) {
        currentMetrics.endpoints[endpoint] = { count: 0, totalTime: 0 };
      }

      currentMetrics.endpoints[endpoint].count++;
      currentMetrics.endpoints[endpoint].totalTime += duration;

      // Store for 5 minutes
      await cacheService.set(key, currentMetrics, 300);
    } catch (error) {
      logger.error('Error updating real-time metrics:', error);
    }
  }

  /**
   * Get performance metrics
   * @param {string} type - Type of metrics to get
   * @returns {Object} Performance metrics
   */
  getMetrics(type = 'all') {
    try {
      const result = {};

      if (type === 'all' || type === 'requests') {
        result.requests = Object.fromEntries(this.metrics.requests);
      }

      if (type === 'all' || type === 'database') {
        result.database = Object.fromEntries(this.metrics.database);
      }

      if (type === 'all' || type === 'cache') {
        result.cache = Object.fromEntries(this.metrics.cache);
      }

      if (type === 'all' || type === 'system') {
        result.system = {
          memory: this.metrics.memory.slice(-10), // Last 10 entries
          cpu: this.metrics.cpu.slice(-10),
          uptime: process.uptime(),
          nodeVersion: process.version,
          platform: os.platform(),
          arch: os.arch()
        };
      }

      if (type === 'all' || type === 'summary') {
        result.summary = this.generateSummary();
      }

      return result;
    } catch (error) {
      logger.error('Error getting performance metrics:', error);
      return {};
    }
  }

  /**
   * Generate performance summary
   * @returns {Object} Performance summary
   */
  generateSummary() {
    try {
      const totalRequests = Array.from(this.metrics.requests.values())
        .reduce((sum, metric) => sum + metric.count, 0);

      const totalErrors = Array.from(this.metrics.requests.values())
        .reduce((sum, metric) => sum + metric.errors, 0);

      const avgResponseTime = Array.from(this.metrics.requests.values())
        .reduce((sum, metric) => sum + metric.avgTime, 0) / this.metrics.requests.size || 0;

      const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

      const latestMemory = this.metrics.memory[this.metrics.memory.length - 1];
      const latestCpu = this.metrics.cpu[this.metrics.cpu.length - 1];

      return {
        requests: {
          total: totalRequests,
          errors: totalErrors,
          errorRate: Math.round(errorRate * 100) / 100,
          avgResponseTime: Math.round(avgResponseTime * 100) / 100
        },
        system: {
          memoryUsage: latestMemory ? Math.round(latestMemory.heap.percentage * 100) / 100 : 0,
          cpuLoad: latestCpu ? Math.round(latestCpu.loadAverage.oneMinute * 100) / 100 : 0,
          uptime: Math.round(process.uptime())
        },
        cache: {
          hitRate: this.calculateOverallCacheHitRate()
        },
        health: this.calculateHealthScore()
      };
    } catch (error) {
      logger.error('Error generating performance summary:', error);
      return {};
    }
  }

  /**
   * Calculate overall cache hit rate
   * @returns {number} Cache hit rate percentage
   */
  calculateOverallCacheHitRate() {
    try {
      let totalHits = 0;
      let totalRequests = 0;

      for (const metric of this.metrics.cache.values()) {
        totalHits += metric.hits;
        totalRequests += metric.hits + metric.misses;
      }

      return totalRequests > 0 ? Math.round((totalHits / totalRequests) * 10000) / 100 : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate application health score
   * @returns {number} Health score (0-100)
   */
  calculateHealthScore() {
    try {
      let score = 100;
      const weights = {
        responseTime: 30,
        errorRate: 30,
        memoryUsage: 20,
        cpuUsage: 20
      };

      // Response time score
      const avgResponseTime = this.generateSummary().requests.avgResponseTime;
      if (avgResponseTime > this.thresholds.responseTime.critical) {
        score -= weights.responseTime;
      } else if (avgResponseTime > this.thresholds.responseTime.warning) {
        score -= weights.responseTime * 0.5;
      }

      // Error rate score
      const errorRate = this.generateSummary().requests.errorRate / 100;
      if (errorRate > this.thresholds.errorRate.critical) {
        score -= weights.errorRate;
      } else if (errorRate > this.thresholds.errorRate.warning) {
        score -= weights.errorRate * 0.5;
      }

      // Memory usage score
      const memoryUsage = this.generateSummary().system.memoryUsage / 100;
      if (memoryUsage > this.thresholds.memoryUsage.critical) {
        score -= weights.memoryUsage;
      } else if (memoryUsage > this.thresholds.memoryUsage.warning) {
        score -= weights.memoryUsage * 0.5;
      }

      // CPU usage score
      const cpuUsage = this.generateSummary().system.cpuLoad;
      if (cpuUsage > this.thresholds.cpuUsage.critical) {
        score -= weights.cpuUsage;
      } else if (cpuUsage > this.thresholds.cpuUsage.warning) {
        score -= weights.cpuUsage * 0.5;
      }

      return Math.max(0, Math.round(score));
    } catch (error) {
      logger.error('Error calculating health score:', error);
      return 50; // Default middle score
    }
  }

  /**
   * Check performance thresholds and send alerts
   */
  async checkThresholds() {
    try {
      const summary = this.generateSummary();

      // Check response time
      if (summary.requests.avgResponseTime > this.thresholds.responseTime.critical) {
        await this.sendAlert('critical', 'High response time', {
          current: summary.requests.avgResponseTime,
          threshold: this.thresholds.responseTime.critical
        });
      }

      // Check error rate
      if (summary.requests.errorRate > this.thresholds.errorRate.critical * 100) {
        await this.sendAlert('critical', 'High error rate', {
          current: summary.requests.errorRate,
          threshold: this.thresholds.errorRate.critical * 100
        });
      }

      // Check memory usage
      if (summary.system.memoryUsage > this.thresholds.memoryUsage.critical * 100) {
        await this.sendAlert('critical', 'High memory usage', {
          current: summary.system.memoryUsage,
          threshold: this.thresholds.memoryUsage.critical * 100
        });
      }

      // Check CPU usage
      if (summary.system.cpuLoad > this.thresholds.cpuUsage.critical) {
        await this.sendAlert('critical', 'High CPU usage', {
          current: summary.system.cpuLoad,
          threshold: this.thresholds.cpuUsage.critical
        });
      }
    } catch (error) {
      logger.error('Error checking performance thresholds:', error);
    }
  }

  /**
   * Send performance alert
   * @param {string} level - Alert level (warning, critical)
   * @param {string} message - Alert message
   * @param {Object} data - Additional data
   */
  async sendAlert(level, message, data = {}) {
    try {
      const alert = {
        level,
        message,
        data,
        timestamp: new Date().toISOString(),
        server: os.hostname()
      };

      logger[level === 'critical' ? 'error' : 'warn'](`Performance Alert: ${message}`, alert);

      // Store alert in cache for dashboard
      const alertKey = `performance_alert:${Date.now()}`;
      await cacheService.set(alertKey, alert, 86400); // 24 hours

      // Send to external monitoring services
      try {
        if (process.env.SLACK_WEBHOOK_URL) {
          await this.sendSlackAlert(alert);
        }

        if (process.env.ENABLE_EMAIL_ALERTS === 'true') {
          await this.sendEmailAlert(alert);
        }

        // Send to Sentry for critical alerts
        if (alert.severity === 'critical') {
          const Sentry = require('@sentry/node');
          Sentry.captureMessage(`Performance Alert: ${alert.type} - ${alert.message}`, 'error');
        }
      } catch (externalError) {
        logger.error('Failed to send external performance alert:', externalError);
      }
    } catch (error) {
      logger.error('Error sending performance alert:', error);
    }
  }

  /**
   * Cache current metrics for external access
   */
  async cacheMetrics() {
    try {
      const metrics = this.getMetrics('summary');
      await cacheService.set('performance_metrics', metrics, 60); // 1 minute
    } catch (error) {
      logger.error('Error caching performance metrics:', error);
    }
  }

  /**
   * Clean old metrics to prevent memory leaks
   */
  cleanOldMetrics() {
    try {
      const oneHourAgo = Date.now() - 3600000;

      // Clean memory metrics
      this.metrics.memory = this.metrics.memory.filter(
        metric => metric.timestamp > oneHourAgo
      );

      // Clean CPU metrics
      this.metrics.cpu = this.metrics.cpu.filter(
        metric => metric.timestamp > oneHourAgo
      );

      logger.debug('Cleaned old performance metrics');
    } catch (error) {
      logger.error('Error cleaning old metrics:', error);
    }
  }

  /**
   * Get V8 heap statistics
   * @returns {Object} V8 heap statistics
   */
  getV8Stats() {
    try {
      return {
        heapStatistics: v8.getHeapStatistics(),
        heapSpaceStatistics: v8.getHeapSpaceStatistics(),
        heapCodeStatistics: v8.getHeapCodeStatistics()
      };
    } catch (error) {
      logger.error('Error getting V8 statistics:', error);
      return {};
    }
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.metrics.requests.clear();
    this.metrics.database.clear();
    this.metrics.cache.clear();
    this.metrics.memory = [];
    this.metrics.cpu = [];
    this.metrics.errors.clear();

    logger.info('Performance metrics reset');
  }
}

// Create singleton instance
const performanceService = new PerformanceService();

module.exports = performanceService;