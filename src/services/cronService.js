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
    cron.schedule('* * * * *', async () => {
      console.log('🕘 Running scheduled reminders every minute for debugging');
      try {
        await reminderService.runAllReminders();
      } catch (error) {
        console.error('❌ Scheduled reminder job failed:', error);
      }
    });

    console.log('✅ Cron jobs scheduled: Reminders running every minute for debugging');
  },

  // Manual trigger for testing
  async triggerRemindersManually() {
    console.log('🔧 Manually triggering reminders...');
    return await reminderService.runAllReminders();
  },
};

export default cronService;