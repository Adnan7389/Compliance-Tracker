import cronService from '../services/cronService.js';
import emailService from '../services/emailService.js';

export const reminderController = {
  async triggerReminders(req, res) {
    try {
      console.log('API: Manual reminder trigger received');
      const result = await cronService.triggerRemindersManually();
      res.status(200).json({
        message: 'Reminders triggered successfully',
        ...result,
      });
    } catch (error) {
      console.error('API: Error triggering reminders:', error);
      res.status(500).json({ message: 'Failed to trigger reminders' });
    }
  },

  async testEmailConnection(req, res) {
    try {
      console.log('API: Testing email connection...');
      const isConnected = await emailService.verifyConnection();
      if (isConnected) {
        res.status(200).json({ message: 'SMTP connection successful!' });
      } else {
        res.status(500).json({ message: 'SMTP connection failed. Check logs for details.' });
      }
    } catch (error) {
      console.error('API: Error testing email connection:', error);
      res.status(500).json({ message: 'Failed to test email connection.' });
    }
  },
};

export default reminderController;
