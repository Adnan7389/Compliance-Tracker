import cron from 'node-cron';
import reminderService from './reminderService.js';

// Only enable cron jobs in production
const isProduction = process.env.NODE_ENV === 'production';

export const cronService = {
  init() {
    if (!isProduction) {
      console.log('⏰ Cron jobs disabled in development');
      return;
    }

    console.log('⏰ Initializing cron jobs...');

    // Daily at 9:00 AM - Send reminders
    // TODO: Revert this back to '0 9 * * *' after debugging
    cron.schedule('*/5 * * * *', async () => { // Changed to every 5 minutes
      console.log('🕘 Running scheduled reminders every 5 minutes for debugging');
      try {
        await reminderService.runAllReminders();
      } catch (error) {
        console.error('❌ Scheduled reminder job failed:', error);
      }
    });

    console.log('✅ Cron jobs scheduled: Reminders running every 5 minutes for debugging');
  },

  // Manual trigger for testing
  async triggerRemindersManually() {
    console.log('🔧 Manually triggering reminders...');
    return await reminderService.runAllReminders();
  },
};

export default cronService;