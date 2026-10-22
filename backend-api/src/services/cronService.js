const cron = require('node-cron');
const ChallengeService = require('./challengeService');
const GamificationService = require('./gamificationService');
const logger = require('../utils/logger');
const Event = require('../models/Event');
const paymentService = require('./paymentService');

class CronService {
  constructor() {
    this.gamificationService = new GamificationService();
    this.challengeService = new ChallengeService(this.gamificationService);
    this.jobs = {};
  }

  /**
   * Initialize all scheduled jobs
   */
  createJob(name, expression, task, options) {
    return cron.createTask(expression, async context => {
      const slot = new Date(context?.date || Date.now()).toISOString().slice(0, 16);
      try { await require('./jobLease').withJobLease(name, task, { slot }); }
      catch { logger.error('Scheduled job failed', { job: name }); }
    }, { ...options, noOverlap: true });
  }

  initialize() {
    this.setupChallengeJobs();
    this.setupEventJobs();
    this.setupMaintenanceJobs();
    logger.info('Cron service initialized with scheduled jobs');
  }

  /**
   * Setup challenge-related cron jobs
   */
  setupChallengeJobs() {
    // Daily challenge cleanup and auto-enrollment - runs at 1:00 AM every day
    this.jobs.dailyChallengeManagement = this.createJob('dailyChallengeManagement', '0 1 * * *', async () => {
      try {
        logger.info('Running daily challenge management...');

        // Clean up expired challenges
        const cleanupResult = await this.challengeService.cleanupExpiredChallenges();
        logger.info('Challenge cleanup completed:', cleanupResult);

        // Auto-enroll users in new daily challenges
        const enrollResult = await this.challengeService.autoEnrollUsersInChallenges();
        logger.info('Auto-enrollment completed:', enrollResult);

        logger.info('Daily challenge management completed successfully');
      } catch (error) {
        logger.error('Error in daily challenge management:', error);
      }
    }, {
      scheduled: false,
      timezone: 'America/New_York' // Adjust timezone as needed
    });

    // Weekly challenge reset - runs at 2:00 AM every Monday
    this.jobs.weeklyChallengeReset = this.createJob('weeklyChallengeReset', '0 2 * * 1', async () => {
      try {
        logger.info('Running weekly challenge reset...');

        // Clean up expired weekly challenges and create new ones
        await this.challengeService.cleanupExpiredChallenges();

        // Auto-enroll users in new weekly challenges
        await this.challengeService.autoEnrollUsersInChallenges();

        logger.info('Weekly challenge reset completed successfully');
      } catch (error) {
        logger.error('Error in weekly challenge reset:', error);
      }
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });

    // Monthly challenge reset - runs at 3:00 AM on the 1st of each month
    this.jobs.monthlyChallengeReset = this.createJob('monthlyChallengeReset', '0 3 1 * *', async () => {
      try {
        logger.info('Running monthly challenge reset...');

        // Clean up expired monthly challenges and create new ones
        await this.challengeService.cleanupExpiredChallenges();

        // Auto-enroll users in new monthly challenges
        await this.challengeService.autoEnrollUsersInChallenges();

        logger.info('Monthly challenge reset completed successfully');
      } catch (error) {
        logger.error('Error in monthly challenge reset:', error);
      }
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });

    // Hourly challenge status check - runs every hour at minute 0
    this.jobs.hourlyChallengeCheck = this.createJob('hourlyChallengeCheck', '0 * * * *', async () => {
      try {
        logger.info('Running hourly challenge status check...');

        // Check for expired challenges that need to be marked as expired
        const cleanupResult = await this.challengeService.cleanupExpiredChallenges();

        if (cleanupResult.expiredUserChallenges > 0 || cleanupResult.recreatedChallenges > 0) {
          logger.info('Hourly challenge check found updates:', cleanupResult);
        }
      } catch (error) {
        logger.error('Error in hourly challenge check:', error);
      }
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });
  }

  /**
   * Setup event-related cron jobs
   */
  setupEventJobs() {
    // Hourly event expiration check - runs every hour at minute 15
    // Automatic event ingestion (Ticketmaster / ICS feeds / etc.) - every 6 hours
    this.jobs.eventIngestion = this.createJob('eventIngestion', '5 */6 * * *', async () => {
      try {
        if (process.env.EVENT_INGESTION_ENABLED === 'false') return;
        const registered = await require('./eventIngestion/GlobalPipelineOrchestrator').runGlobalIngestionCycle({ dueOnly: true });
        logger.info('Registered source ingestion', registered.stats);
        try {
          const { seedPlanetaryEvents } = require('./eventIngestion/planetaryEventHarvester');
          await seedPlanetaryEvents();
          const { syncVirtualStreams } = require('./eventIngestion/virtualEventHarvester');
          await syncVirtualStreams();
          const { syncClinicalTrials } = require('./eventIngestion/clinicalTrialsHarvester');
          await syncClinicalTrials();
          const { syncRDTickets } = require('./eventIngestion/rdTicketsHarvester');
          await syncRDTickets();
          logger.info('Planetary & virtual streams rolling refresh completed');
        } catch (planErr) {
          logger.warn('Planetary scheduled refresh warning: ' + planErr.message);
        }
      } catch (error) {
        logger.error('Error in scheduled event ingestion:', error);
      }
    }, {
      scheduled: false,
      timezone: 'America/Santo_Domingo'
    });

    this.jobs.hourlyEventExpiration = this.createJob('hourlyEventExpiration', '15 * * * *', async () => {
      try {
        logger.info('Running hourly event expiration check...');

        // Expire all past events
        const result = await Event.expirePastEvents();

        if (result.modifiedCount > 0) {
          logger.info(`Marked ${result.modifiedCount} events as expired`);
        }
      } catch (error) {
        logger.error('Error in hourly event expiration check:', error);
      }
    }, {
      scheduled: false,
      timezone: 'America/Santo_Domingo'
    });

    // Daily event cleanup - runs at 2:30 AM every day
    this.jobs.dailyEventCleanup = this.createJob('dailyEventCleanup', '30 2 * * *', async () => {
      try {
        logger.info('Running daily event cleanup...');

        // Expire all past events
        const expireResult = await Event.expirePastEvents();
        logger.info(`Expired ${expireResult.modifiedCount} past events`);

        // Preserve references to tickets, orders and reviews by archiving old events.
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const cleanupResult = await Event.updateMany({
          status: 'expired', archivedAt: null,
          updatedAt: { $lt: sixMonthsAgo }
        }, { $set: { archivedAt: new Date() } });

        if (cleanupResult.modifiedCount > 0) {
          logger.info(`Archived ${cleanupResult.modifiedCount} old expired events`);
        }

        logger.info('Daily event cleanup completed');
      } catch (error) {
        logger.error('Error in daily event cleanup:', error);
      }
    }, {
      scheduled: false,
      timezone: 'America/Santo_Domingo'
    });
  }

  /**
   * Setup maintenance-related cron jobs
   */
  setupMaintenanceJobs() {
    this.jobs.pushReceipts = this.createJob('pushReceipts', '*/5 * * * *', async () => {
      try { await require('./pushReceipts').checkPushReceipts(); }
      catch { logger.warn('Push receipt check will retry on the next schedule'); }
    }, { noOverlap: true, timezone: 'UTC' });
    this.jobs.orderInventoryRecovery = this.createJob('orderInventoryRecovery', '*/5 * * * *', async () => {
      try {
        await paymentService.recoverInventoryReleases();
        await paymentService.cleanupExpiredOrders();
      } catch (error) {
        logger.error('Order maintenance failed:', error);
      }
    }, { noOverlap: true, timezone: 'America/Santo_Domingo' });
    // Daily statistics aggregation - runs at 4:00 AM every day
    this.jobs.dailyStatsAggregation = this.createJob('dailyStatsAggregation', '0 4 * * *', async () => {
      try {
        logger.info('Running daily statistics aggregation...');

        // This could include aggregating user activity, challenge completion rates, etc.
        // For now, we'll just log that it's running
        logger.info('Daily statistics aggregation completed');
      } catch (error) {
        logger.error('Error in daily statistics aggregation:', error);
      }
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });

    // Weekly leaderboard update - runs at 5:00 AM every Sunday
    this.jobs.weeklyLeaderboardUpdate = this.createJob('weeklyLeaderboardUpdate', '0 5 * * 0', async () => {
      try {
        logger.info('Running weekly leaderboard update...');

        // This could include caching leaderboard results for better performance
        // For now, we'll just log that it's running
        logger.info('Weekly leaderboard update completed');
      } catch (error) {
        logger.error('Error in weekly leaderboard update:', error);
      }
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });

    // Database cleanup - runs at 6:00 AM every Sunday
    this.jobs.weeklyDatabaseCleanup = this.createJob('weeklyDatabaseCleanup', '0 6 * * 0', async () => {
      try {
        logger.info('Running weekly database cleanup...');

        // This could include cleaning up old logs, expired sessions, etc.
        // For now, we'll just log that it's running
        logger.info('Weekly database cleanup completed');
      } catch (error) {
        logger.error('Error in weekly database cleanup:', error);
      }
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });
  }

  /**
   * Start all scheduled jobs
   */
  start() {
    Object.keys(this.jobs).forEach(jobName => {
      this.jobs[jobName].start();
      logger.info(`Started cron job: ${jobName}`);
    });
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    Object.keys(this.jobs).forEach(jobName => {
      this.jobs[jobName].stop();
      logger.info(`Stopped cron job: ${jobName}`);
    });
  }

  /**
   * Get status of all jobs
   */
  getJobsStatus() {
    const status = {};
    Object.keys(this.jobs).forEach(jobName => {
      status[jobName] = {
        running: this.jobs[jobName].running || false,
        scheduled: this.jobs[jobName].scheduled || false,
      };
    });
    return status;
  }

  /**
   * Start a specific job
   */
  startJob(jobName) {
    if (this.jobs[jobName]) {
      this.jobs[jobName].start();
      logger.info(`Started specific cron job: ${jobName}`);
      return true;
    }
    logger.warn(`Cron job not found: ${jobName}`);
    return false;
  }

  /**
   * Stop a specific job
   */
  stopJob(jobName) {
    if (this.jobs[jobName]) {
      this.jobs[jobName].stop();
      logger.info(`Stopped specific cron job: ${jobName}`);
      return true;
    }
    logger.warn(`Cron job not found: ${jobName}`);
    return false;
  }

  /**
   * Manually trigger a job (for testing purposes)
   */
  async triggerJob(jobName) {
    try {
      logger.info(`Manually triggering cron job: ${jobName}`);

      switch (jobName) {
      case 'orderInventoryRecovery': {
        const recovery = await paymentService.recoverInventoryReleases();
        const expiration = await paymentService.cleanupExpiredOrders();
        return { ...recovery, ...expiration };
      }
      case 'dailyChallengeManagement': {
        const cleanupResult = await this.challengeService.cleanupExpiredChallenges();
        const enrollResult = await this.challengeService.autoEnrollUsersInChallenges();
        return { cleanupResult, enrollResult };
      }

      case 'weeklyChallengeReset':
      case 'monthlyChallengeReset':
        await this.challengeService.cleanupExpiredChallenges();
        await this.challengeService.autoEnrollUsersInChallenges();
        return { message: 'Challenge reset completed' };

      case 'hourlyChallengeCheck':
        return await this.challengeService.cleanupExpiredChallenges();

      case 'hourlyEventExpiration': {
        const result = await Event.expirePastEvents();
        return {
          message: 'Event expiration completed',
          modifiedCount: result.modifiedCount
        };
      }

      case 'dailyEventCleanup': {
        const expireResult = await Event.expirePastEvents();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const cleanupResult = await Event.updateMany({
          status: 'expired', archivedAt: null,
          updatedAt: { $lt: sixMonthsAgo }
        }, { $set: { archivedAt: new Date() } });
        return {
          message: 'Event cleanup completed',
          expiredCount: expireResult.modifiedCount,
          deletedCount: cleanupResult.modifiedCount
        };
      }

      default:
        throw new Error(`Unknown job: ${jobName}`);
      }
    } catch (error) {
      logger.error(`Error manually triggering job ${jobName}:`, error);
      throw error;
    }
  }

  /**
   * Set the gamification service instance
   */
  setGamificationService(gamificationService) {
    this.gamificationService = gamificationService;
    this.challengeService.setGamificationService(gamificationService);
  }

  /**
   * Set the notification service instance
   */
  setNotificationService(notificationService) {
    this.challengeService.setNotificationService(notificationService);
  }
}

module.exports = CronService;
