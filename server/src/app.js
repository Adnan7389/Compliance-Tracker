import express from "express";
import dotenv from "dotenv";
import cors from "cors";
// import authRoutes from "./routes/authRoutes.js";
// import staffRoutes from "./routes/staffRoutes.js";
// import taskRoutes from "./routes/taskRoutes.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// // Routes
// app.use("/api/auth", authRoutes);
// app.use("/api/staff", staffRoutes);
// app.use("/api/tasks", taskRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Compliance Tracker API is running 🚀" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));