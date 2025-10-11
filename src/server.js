import './config/env.js';
import { app } from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Email service: ${process.env.SMTP_USER ? 'Configured' : 'Not configured'}`);
  console.log(`⏰ Cron jobs: ${process.env.NODE_ENV === 'production' ? 'Enabled' : 'Disabled'}`);
});