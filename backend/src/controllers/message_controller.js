import User from "../models/user_model.js";
import Message from "../models/message_model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } })
      .select("-password -__v")
      .lean();

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    // Check for mutual following
    const [me, otherUser] = await Promise.all([
      User.findById(myId),
      User.findById(userToChatId)
    ]);

    const isMutualFollow = me.following.includes(userToChatId) && otherUser.following.includes(myId);

    if (!isMutualFollow) {
      return res.status(403).json({ error: "Both users must follow each other to chat." });
    }

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body || {};
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Check for mutual following
    const [sender, receiver] = await Promise.all([
      User.findById(senderId),
      User.findById(receiverId)
    ]);

    const isMutualFollow = sender.following.includes(receiverId) && receiver.following.includes(senderId);

    if (!isMutualFollow) {
      return res.status(403).json({ error: "Both users must follow each other to chat." });
    }

    if (!text && !image) {
      return res.status(400).json({ error: "Message must contain either text or image" });
    }

    let imageUrl;
    if (image) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(image);
        imageUrl = uploadResponse.secure_url;
      } catch (error) {
        console.error("Error uploading image:", error);
        return res.status(500).json({ error: "Failed to upload image" });
      }
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      status: "sent", // Set initial status
    });

    await newMessage.save();

    // Get receiver's socket id and send message
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      const io = req.app.get("io");
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body;

    if (!["delivered", "read"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Skip if status is already the same or higher
    const statusPriority = { sent: 1, delivered: 2, read: 3 };
    if (statusPriority[status] <= statusPriority[message.status]) {
      return res.status(200).json({ message: "No update needed" });
    }

    message.status = status;
    await message.save();

    const senderSocketId = getReceiverSocketId(message.senderId.toString());
    if (senderSocketId) {
      const io = req.app.get("io");
      io.to(senderSocketId).emit("messageStatusUpdate", {
        messageId: message._id,
        status,
      });
    }

    res.status(200).json({ message: "Status updated", status });
  } catch (error) {
    console.error("Error in updateMessageStatus:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const { senderId } = req.body;
    const receiverId = req.user._id;

    const updated = await Message.updateMany(
      { senderId, receiverId, status: { $ne: "read" } },
      { $set: { status: "read" } }
    );

    // Emit status updates to sender
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      const io = req.app.get("io");
      io.to(senderSocketId).emit("bulkReadStatusUpdate", {
        from: receiverId,
      });
    }

    res.status(200).json({ updatedCount: updated.modifiedCount });
  } catch (error) {
    console.error("Error in markAllAsRead:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};