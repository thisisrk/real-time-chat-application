import express from "express";
import { protectRoute } from "../middleware/auth_middleware.js";
import User from "../models/user_model.js";

const router = express.Router();

// Get all users
router.get("/", protectRoute, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select("-password");
    res.status(200).json(users);
  } catch (error) {
    console.log("Error in getUsers controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get user by ID
router.get("/:id", protectRoute, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.log("Error in getUserById controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router; 