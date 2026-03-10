import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();

/* Middleware */

app.use(cors());
app.use(express.json());

/* MongoDB */

mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB connected successfully"))
.catch((err)=>console.log(err));

/* Routes */

app.use("/api/auth", authRoutes);

app.get("/", (req,res)=>{
  res.send("Server running");
});

/* Server */

const PORT = process.env.PORT || 5000;

app.listen(PORT, ()=>{
  console.log(`Server running on port ${PORT}`);
});