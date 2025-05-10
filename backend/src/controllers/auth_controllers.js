import { generateToken } from "../lib/utils.js";
import User from "../models/user_model.js";
import OTP from "../models/otp_model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import { sendVerificationEmail } from "../lib/email_service.js";
import crypto from "crypto";

// Helper function to validate a 10-digit phone number
const isValidPhoneNumber = (number) => /^\d{10}$/.test(number);

// Generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const signup = async (req, res) => {
  const { fullName, email, password, number } = req.body;

  try {
    if (!fullName || !email || !password || !number) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    if (!isValidPhoneNumber(number)) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate OTP
    const otp = generateOTP();
    
    // Save OTP to database
    await OTP.findOneAndUpdate(
      { email },
      { otp },
      { upsert: true, new: true }
    );

    // Send verification email
    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send verification email" });
    }    // Generate a username from email (part before @)
    const baseUsername = email.split('@')[0];
    
    // Check if username exists and generate a unique one if needed
    let username = baseUsername;
    let counter = 1;
    while (await User.findOne({ username })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    // Create new user with unverified status
    const newUser = new User({
      fullName,
      email,
      number,
      username,
      password: hashedPassword,
      isEmailVerified: false,
      verificationToken: crypto.randomBytes(32).toString("hex"),
    });

    await newUser.save();

    res.status(201).json({
      message: "User created successfully. Please verify your email.",
      email: newUser.email,
    });
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    console.log("Verifying OTP for email:", email);
    console.log("Received OTP:", otp);

    if (!email || !otp) {
      console.log("Missing required fields - email or OTP");
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const otpRecord = await OTP.findOne({ email });
    console.log("OTP record found:", otpRecord);
    
    if (!otpRecord) {
      console.log("No OTP record found for email:", email);
      return res.status(400).json({ message: "OTP not found or expired" });
    }

    if (otpRecord.otp !== otp) {
      console.log("OTP mismatch. Expected:", otpRecord.otp, "Received:", otp);
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found for email:", email);
      return res.status(404).json({ message: "User not found" });
    }

    user.isEmailVerified = true;
    await user.save();
    await OTP.deleteOne({ email });

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      number: user.number,
      username: user.username,
      profilePic: user.profilePic,
      isEmailVerified: true,
    });
  } catch (error) {
    console.log("Error in verifyOTP controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const resendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const otp = generateOTP();
    await OTP.findOneAndUpdate(
      { email },
      { otp },
      { upsert: true, new: true }
    );

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send verification email" });
    }

    res.status(200).json({ message: "OTP resent successfully" });
  } catch (error) {
    console.log("Error in resendOTP controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.log("Error in resetPassword controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      number: user.number,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic, number, username, bio, birthday } = req.body;
    const userId = req.user._id;

    const updateData = {};

    if (profilePic) {
      try {
        // Retry upload up to 3 times
        let uploadResponse;
        let attempts = 0;
        const maxAttempts = 3;

        while (!uploadResponse && attempts < maxAttempts) {
          try {
            uploadResponse = await cloudinary.uploader.upload(profilePic, {
              timeout: 60000,
              resource_type: "auto",
              quality: "auto:good",
              fetch_format: "auto",
              flags: "attachment",
              transformation: [
                { width: 500, crop: "limit" },
                { quality: "auto:good" }
              ]
            });
          } catch (uploadError) {
            attempts++;
            if (attempts === maxAttempts) throw uploadError;
            // Wait for 2 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        updateData.profilePic = uploadResponse.secure_url;
      } catch (uploadError) {
        console.error("Error uploading image:", uploadError);
        return res.status(500).json({ 
          message: "Failed to upload image. Please try again with a smaller image or check your connection."
        });
      }
    }

    if (number) {
      if (!isValidPhoneNumber(number)) {
        return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
      }
      updateData.number = number;
    }

    if (username) {
      const existing = await User.findOne({ 
        username: { $regex: `^${username}$`, $options: 'i' }, 
        _id: { $ne: userId } 
      });
      if (existing) {
        return res.status(400).json({ message: "Username already taken" });
      }
      updateData.username = username;
    }

    if (typeof bio === 'string') {
      updateData.bio = bio;
    }

    if (birthday) {
      updateData.birthday = birthday;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error in updateProfile controller:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
