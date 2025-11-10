import './config/env.js';
import { app } from './app.js';
import { closePool } from './config/db.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Email service: ${process.env.SMTP_USER ? 'Configured' : 'Not configured'}`);
  console.log(`⏰ Cron jobs: ${process.env.NODE_ENV === 'production' ? 'Enabled' : 'Disabled'}`);
});

const gracefulShutdown = () => {
  console.log('👋 Received kill signal, shutting down gracefully.');
  server.close(() => {
    console.log('Closed out remaining connections.');
    closePool().then(() => {
      process.exit(0);
    });
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);