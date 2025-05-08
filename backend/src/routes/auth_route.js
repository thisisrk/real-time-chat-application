import express from "express";
import { signup, login, logout, updateProfile, checkAuth, verifyOTP, resendOTP } from "../controllers/auth_controllers.js";
import { protectRoute } from "../middleware/auth_middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.get("/check", protectRoute, checkAuth);
router.put("/update", protectRoute, updateProfile);

export default router;