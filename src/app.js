import "./config/env.js";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import documentRoutes from './routes/documentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import testRoutes from './routes/testRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import cronService from './services/cronService.js';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/tasks", taskRoutes);
app.use('/api', documentRoutes);
app.use('/api', testRoutes);
app.use('/api', dashboardRoutes);

// Initialize cron jobs
cronService.init();

// Error handling
app.use(notFound);
app.use(errorHandler);

app.get("/", (req, res) => {
  res.json({ message: "Compliance Tracker API is running 🚀" });
});

export { app };