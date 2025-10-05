import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import documentRoutes from './routes/documentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import testRoutes from './routes/testRoutes.js'; 
import { errorHandler, notFound } from './middleware/errorHandler.js';
import cronService from './services/cronService.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// // Routes
app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/tasks", taskRoutes);
app.use('/api', documentRoutes);
app.use('/api', testRoutes);
app.use('/api', dashboardRoutes);

// Initialize cron jobs
cronService.init(); // Add this line

// Error handling
app.use(notFound);
app.use(errorHandler);

app.get("/", (req, res) => {
  res.json({ message: "Compliance Tracker API is running 🚀" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Email service: ${process.env.SMTP_USER ? 'Configured' : 'Not configured'}`);
  console.log(`⏰ Cron jobs: ${process.env.NODE_ENV === 'production' ? 'Enabled' : 'Disabled'}`);
});