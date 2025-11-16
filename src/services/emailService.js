// Import the SendGrid mail library
import sgMail from '@sendgrid/mail';

// Set the SendGrid API key from environment variables.
// This is a critical step for authenticating with SendGrid.
// You need to create a SendGrid account and generate an API key.
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// This object encapsulates all email-related functionality.
export const emailService = {
  /**
   * Sends an email using the SendGrid API.
   * @param {object} options - The email options.
   * @param {string} options.to - The primary recipient's email address.
   * @param {string} [options.bcc] - An email address to be blind carbon copied.
   * @param {string} options.subject - The subject line of the email.
   * @param {string} options.text - The plain text body of the email.
   */
  async sendMail({ to, bcc, subject, text }) {
    try {
      // Construct the message object in the format SendGrid expects.
      const msg = {
        to,
        from: process.env.FROM_EMAIL, // This must be a verified sender in your SendGrid account.
        bcc,
        subject,
        text,
      };

      // Use the SendGrid library to send the email.
      const result = await sgMail.send(msg);
      console.log(`✅ Email sent to ${to}: ${result[0].statusCode}`);
      return result;
    } catch (error) {
      // If SendGrid returns an error, it will be caught here.
      // The error object often contains a `response.body.errors` array with more details.
      console.error('❌ Email send failed:', error.message);
      if (error.response) {
        console.error('SendGrid Error Body:', JSON.stringify(error.response.body, null, 2));
      }
      throw error;
    }
  },

  /**
   * Verifies the connection to SendGrid by making a test API call.
   * In this case, we can't truly "verify" the connection in the same way as with SMTP.
   * A successful API key setup is the main verification.
   * We will simulate a verification by checking if the API key is set.
   * A more robust check would be to send a test email to a specific address.
   */
  async verifyConnection() {
    if (process.env.SENDGRID_API_KEY) {
      console.log('✅ SendGrid API key is configured.');
      // You could add a small API call here to truly test it,
      // but for now, we'll assume if the key is present, it's "verified".
      return true;
    } else {
      console.error('❌ SendGrid API key is not set. Please set the SENDGRID_API_KEY environment variable.');
      return false;
    }
  },
};

export default emailService;