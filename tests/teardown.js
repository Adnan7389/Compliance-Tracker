import { pool } from "../src/config/db.js";

export default async () => {
  console.log("🧹 Tearing down test environment...");
  await pool.end();
  console.log("✅ Database pool closed.");
};