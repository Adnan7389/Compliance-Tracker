import reminderService from '../services/reminderService.js';
import emailService from '../services/emailService.js';

export const testController = {
  // Manual trigger for reminders (development only)
  async triggerReminders(req, res) {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          message: 'Manual triggers disabled in production'
        });
      }

      const result = await reminderService.runAllReminders();
      
      res.json({
        message: 'Reminders triggered manually',
        result
      });
      
    } catch (error) {
      console.error('Manual trigger error:', error);
      res.status(500).json({
        message: 'Failed to trigger reminders',
        error: error.message
      });
    }
  },

  // Test email service
  async testEmail(req, res) {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          message: 'Email tests disabled in production'
        });
      }

      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          message: 'Email address required'
        });
      }

      // Test connection first
      const connectionOk = await emailService.verifyConnection();
      if (!connectionOk) {
        return res.status(500).json({
          message: 'SMTP connection failed'
        });
      }

      // Send test email
      await emailService.sendMail({
        to: email,
        subject: '✅ Compliance Tracker - Test Email',
        text: 'This is a test email from your Compliance Tracker system. If you receive this, email configuration is working correctly!'
      });

      res.json({
        message: 'Test email sent successfully',
        to: email
      });
      
    } catch (error) {
      console.error('Email test error:', error);
      res.status(500).json({
        message: 'Failed to send test email',
        error: error.message
      });
    }
  },

  // Test email service for production (owner only)
  async testProductionEmail(req, res) {
    try {
      const { email } = req.user; // Use owner's email from token

      // Verify SMTP connection
      const connectionOk = await emailService.verifyConnection();
      if (!connectionOk) {
        return res.status(500).json({
          message: 'SMTP connection could not be verified. Check email service configuration.'
        });
      }

      // Send test email
      await emailService.sendMail({
        to: email,
        subject: '✅ Compliance Tracker - Production Test Email',
        text: 'This is a test email from your Compliance Tracker production system. If you receive this, the email service is working correctly.'
      });

      res.json({
        message: 'Production test email sent successfully.',
        to: email
      });

    } catch (error) {
      console.error('Production email test error:', error);
      res.status(500).json({
        message: 'Failed to send production test email',
        error: error.message
      });
    }
  }
};