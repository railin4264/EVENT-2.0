#!/bin/bash

# EventConnect 2.0 - Analytics and Metrics Setup Script
# Configures comprehensive analytics and monitoring for production

set -e

# Configuration
GRAFANA_PORT=3001
PROMETHEUS_PORT=9090
ANALYTICS_DB="eventconnect_analytics"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Setup Grafana dashboards
setup_grafana_dashboards() {
    log "Setting up Grafana dashboards..."

    # Wait for Grafana to be ready
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:$GRAFANA_PORT/api/health" > /dev/null; then
            break
        fi
        log "Waiting for Grafana to be ready... ($attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done

    # Create EventConnect Dashboard
    cat > /tmp/eventconnect-dashboard.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "EventConnect 2.0 - System Overview",
    "tags": ["eventconnect", "system"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "API Response Times",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th Percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th Percentile"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(active_users_total)",
            "legendFormat": "Active Users"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "mongodb_connections",
            "legendFormat": "MongoDB Connections"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "Redis Cache Hit Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "redis_cache_hit_rate",
            "legendFormat": "Cache Hit Rate"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      },
      {
        "id": 5,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx Errors"
          },
          {
            "expr": "rate(http_requests_total{status=~\"4..\"}[5m])",
            "legendFormat": "4xx Errors"
          }
        ],
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 16}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
EOF

    # Import dashboard
    curl -X POST \
        -H "Content-Type: application/json" \
        -d @/tmp/eventconnect-dashboard.json \
        "http://admin:${GRAFANA_PASSWORD}@localhost:$GRAFANA_PORT/api/dashboards/db"

    success "Grafana dashboards configured"
}

# Setup Prometheus alerts
setup_prometheus_alerts() {
    log "Setting up Prometheus alerts..."

    cat > /tmp/eventconnect-alerts.yml << 'EOF'
groups:
  - name: eventconnect
    rules:
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: DatabaseConnectionsHigh
        expr: mongodb_connections > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connections"
          description: "MongoDB connections: {{ $value }}"

      - alert: CacheHitRateLow
        expr: redis_cache_hit_rate < 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value }}"

      - alert: DiskSpaceUsage
        expr: (node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High disk usage"
          description: "Disk usage is above 80%"

      - alert: MemoryUsageHigh
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage"
          description: "Memory usage is above 90%"
EOF

    # Copy alerts to prometheus config directory
    docker cp /tmp/eventconnect-alerts.yml prometheus:/etc/prometheus/rules/

    # Reload Prometheus configuration
    curl -X POST http://localhost:$PROMETHEUS_PORT/-/reload

    success "Prometheus alerts configured"
}

# Setup Google Analytics integration
setup_google_analytics() {
    log "Setting up Google Analytics integration..."

    cat > /tmp/analytics-collector.js << 'EOF'
// EventConnect Google Analytics Collector
const { google } = require('googleapis');
const analytics = google.analytics('v3');

class GoogleAnalyticsCollector {
  constructor(viewId, keyFilePath) {
    this.viewId = viewId;
    this.auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly']
    });
  }

  async getRealtimeData() {
    const authClient = await this.auth.getClient();

    const response = await analytics.data.realtime.get({
      auth: authClient,
      ids: `ga:${this.viewId}`,
      metrics: 'rt:activeUsers,rt:pageviews',
      dimensions: 'rt:country,rt:deviceCategory'
    });

    return response.data;
  }

  async getDailyMetrics() {
    const authClient = await this.auth.getClient();

    const response = await analytics.data.ga.get({
      auth: authClient,
      ids: `ga:${this.viewId}`,
      'start-date': '7daysAgo',
      'end-date': 'today',
      metrics: 'ga:users,ga:sessions,ga:pageviews,ga:bounceRate,ga:avgSessionDuration',
      dimensions: 'ga:date'
    });

    return response.data;
  }
}

module.exports = GoogleAnalyticsCollector;
EOF

    success "Google Analytics integration configured"
}

# Setup custom metrics endpoint
setup_custom_metrics() {
    log "Setting up custom metrics endpoint..."

    cat > /tmp/metrics-service.js << 'EOF'
// EventConnect Custom Metrics Service
const prometheus = require('prom-client');
const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');

// Create custom metrics
const activeUsersGauge = new prometheus.Gauge({
  name: 'eventconnect_active_users_total',
  help: 'Total number of active users'
});

const eventsCreatedCounter = new prometheus.Counter({
  name: 'eventconnect_events_created_total',
  help: 'Total number of events created'
});

const tribesJoinedCounter = new prometheus.Counter({
  name: 'eventconnect_tribes_joined_total',
  help: 'Total number of tribe joins'
});

const messagesSentCounter = new prometheus.Counter({
  name: 'eventconnect_messages_sent_total',
  help: 'Total number of messages sent'
});

const cacheHitRateGauge = new prometheus.Gauge({
  name: 'eventconnect_cache_hit_rate',
  help: 'Redis cache hit rate'
});

const databaseQueryDuration = new prometheus.Histogram({
  name: 'eventconnect_database_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'collection']
});

// Metrics collection functions
async function collectActiveUsers() {
  try {
    const count = await mongoose.connection.db.collection('users').countDocuments({
      lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    activeUsersGauge.set(count);
  } catch (error) {
    console.error('Error collecting active users metric:', error);
  }
}

async function collectCacheMetrics() {
  try {
    const redisClient = redis.createClient(process.env.REDIS_URL);
    const info = await redisClient.info('stats');

    const hits = parseInt(info.match(/keyspace_hits:(\d+)/)[1]);
    const misses = parseInt(info.match(/keyspace_misses:(\d+)/)[1]);
    const total = hits + misses;

    const hitRate = total > 0 ? hits / total : 0;
    cacheHitRateGauge.set(hitRate);

    await redisClient.quit();
  } catch (error) {
    console.error('Error collecting cache metrics:', error);
  }
}

// Start metrics collection
setInterval(collectActiveUsers, 60000); // Every minute
setInterval(collectCacheMetrics, 30000); // Every 30 seconds

// Metrics endpoint
const app = express();

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', prometheus.register.contentType);
    res.end(await prometheus.register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
});

const PORT = process.env.METRICS_PORT || 9091;
app.listen(PORT, () => {
  console.log(`Metrics server listening on port ${PORT}`);
});

module.exports = {
  eventsCreatedCounter,
  tribesJoinedCounter,
  messagesSentCounter,
  databaseQueryDuration
};
EOF

    success "Custom metrics endpoint configured"
}

# Setup log aggregation
setup_log_aggregation() {
    log "Setting up log aggregation..."

    cat > /tmp/fluent.conf << 'EOF'
<source>
  @type tail
  path /var/log/eventconnect/*.log
  pos_file /var/log/fluent/eventconnect.log.pos
  tag eventconnect.*
  format json
  time_key timestamp
  time_format %Y-%m-%dT%H:%M:%S.%L%z
</source>

<filter eventconnect.**>
  @type parser
  key_name message
  <parse>
    @type json
  </parse>
</filter>

<match eventconnect.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  index_name eventconnect-logs
  type_name _doc
  include_tag_key true
  tag_key @log_name
  flush_interval 10s
</match>
EOF

    success "Log aggregation configured"
}

# Setup performance monitoring
setup_performance_monitoring() {
    log "Setting up performance monitoring..."

    cat > /tmp/performance-monitor.js << 'EOF'
// EventConnect Performance Monitor
const os = require('os');
const v8 = require('v8');
const process = require('process');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      cpu: [],
      memory: [],
      eventLoop: [],
      gc: []
    };

    this.startMonitoring();
  }

  startMonitoring() {
    // CPU monitoring
    setInterval(() => {
      const cpus = os.cpus();
      const usage = cpus.map(cpu => {
        const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
        const idle = cpu.times.idle;
        return Math.round(100 - (100 * idle / total));
      });

      this.metrics.cpu.push({
        timestamp: new Date(),
        usage: usage.reduce((acc, val) => acc + val, 0) / usage.length
      });
    }, 5000);

    // Memory monitoring
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapStats = v8.getHeapStatistics();

      this.metrics.memory.push({
        timestamp: new Date(),
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        heapSizeLimit: heapStats.heap_size_limit,
        totalAvailableSize: heapStats.total_available_size
      });
    }, 10000);

    // Event loop monitoring
    setInterval(() => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const delta = process.hrtime.bigint() - start;
        this.metrics.eventLoop.push({
          timestamp: new Date(),
          lag: Number(delta) / 1e6 // Convert to milliseconds
        });
      });
    }, 1000);

    // GC monitoring
    const obs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.metrics.gc.push({
          timestamp: new Date(),
          kind: entry.kind,
          duration: entry.duration,
          startTime: entry.startTime
        });
      });
    });
    obs.observe({ entryTypes: ['gc'] });
  }

  getMetrics() {
    return this.metrics;
  }

  getHealthScore() {
    const recent = Date.now() - 60000; // Last minute

    const recentCpu = this.metrics.cpu
      .filter(m => m.timestamp.getTime() > recent)
      .map(m => m.usage);

    const recentMemory = this.metrics.memory
      .filter(m => m.timestamp.getTime() > recent)
      .map(m => m.heapUsed / m.heapTotal);

    const recentEventLoop = this.metrics.eventLoop
      .filter(m => m.timestamp.getTime() > recent)
      .map(m => m.lag);

    const avgCpu = recentCpu.reduce((acc, val) => acc + val, 0) / recentCpu.length || 0;
    const avgMemory = recentMemory.reduce((acc, val) => acc + val, 0) / recentMemory.length || 0;
    const avgEventLoop = recentEventLoop.reduce((acc, val) => acc + val, 0) / recentEventLoop.length || 0;

    // Calculate health score (0-100)
    let score = 100;

    if (avgCpu > 80) score -= 30;
    else if (avgCpu > 60) score -= 20;
    else if (avgCpu > 40) score -= 10;

    if (avgMemory > 0.9) score -= 30;
    else if (avgMemory > 0.8) score -= 20;
    else if (avgMemory > 0.7) score -= 10;

    if (avgEventLoop > 100) score -= 20;
    else if (avgEventLoop > 50) score -= 10;

    return Math.max(0, score);
  }
}

module.exports = PerformanceMonitor;
EOF

    success "Performance monitoring configured"
}

# Main function
main() {
    log "Starting EventConnect 2.0 analytics and metrics setup..."

    # Check if required services are running
    if ! docker ps | grep -q prometheus; then
        error "Prometheus is not running. Please start monitoring stack first."
    fi

    if ! docker ps | grep -q grafana; then
        error "Grafana is not running. Please start monitoring stack first."
    fi

    # Setup components
    setup_grafana_dashboards
    setup_prometheus_alerts
    setup_google_analytics
    setup_custom_metrics
    setup_log_aggregation
    setup_performance_monitoring

    success "Analytics and metrics setup completed!"

    echo
    echo -e "${GREEN}=== ANALYTICS SUMMARY ===${NC}"
    echo -e "Grafana Dashboard: http://localhost:$GRAFANA_PORT"
    echo -e "Prometheus: http://localhost:$PROMETHEUS_PORT"
    echo -e "Custom Metrics: http://localhost:9091/metrics"
    echo
    echo -e "${YELLOW}Login to Grafana with:${NC}"
    echo -e "Username: admin"
    echo -e "Password: ${GRAFANA_PASSWORD}"
    echo
}

# Check for required environment variables
if [ -z "$GRAFANA_PASSWORD" ]; then
    error "GRAFANA_PASSWORD environment variable is required"
fi

# Run main function
main "$@"