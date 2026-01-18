import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Connect MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log(" MongoDB connected successfully"))
  .catch((err) => console.log(" MongoDB connection failed:", err));

// Routes
app.use("/api/auth", authRoutes);

// Start server
app.listen(process.env.PORT, () =>
  console.log(` Server running on port ${process.env.PORT}`)
);
