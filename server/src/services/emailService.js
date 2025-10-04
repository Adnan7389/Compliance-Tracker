import nodemailer from 'nodemailer';

// Create transporter for Gmail SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // Use TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // Use App Password for Gmail
  },
});

// Basic email sending function
export const emailService = {
  async sendMail({ to, bcc, subject, text }) {
    try {
      const mailOptions = {
        from: process.env.FROM_EMAIL || process.env.SMTP_USER,
        to,
        bcc,
        subject,
        text, // Plain text only for MVP
      };

      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${to}: ${result.messageId}`);
      return result;
    } catch (error) {
      console.error('❌ Email send failed:', error.message);
      throw error;
    }
  },

  // Test email connection
  async verifyConnection() {
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection failed:', error.message);
      return false;
    }
  },
};

export default emailService;