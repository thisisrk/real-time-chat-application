import express from "express";
import { protectRoute } from "../middleware/auth_middleware.js";
import User from "../models/user_model.js";

const router = express.Router();

// Get all users
router.get("/", protectRoute, async (req, res) => {
  try {
    // Get current user with following info
    const currentUser = await User.findById(req.user._id)
      .select("following followers");

    // Get all other users with their followers/following
    const users = await User.find({ 
      _id: { $ne: req.user._id } 
    }).select("-password");

    // Add mutual follow status to each user
    const usersWithMutualStatus = users.map(user => {
      const userObj = user.toJSON();
      const isFollowingMe = userObj.followers?.includes(req.user._id);
      const amFollowing = currentUser.following?.includes(user._id);
      return {
        ...userObj,
        isMutualFollow: isFollowingMe && amFollowing
      };
    });

    res.status(200).json(usersWithMutualStatus);
  } catch (error) {
    console.log("Error in getUsers controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Fetch follow requests for the authenticated user
router.get("/requests", protectRoute, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("followRequests", "username profilePic fullName")
      .select("followRequests");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const requests = user.followRequests || [];
    res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching follow requests:", error);
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

// Get user's followers
router.get("/followers/:userId", protectRoute, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("followers")
      .populate("followers", "-password -__v -email -following -followers");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user.followers);
  } catch (error) {
    console.log("Error in getFollowers:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get user's following list
router.get("/following/:userId", protectRoute, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("following")
      .populate("following", "-password -__v -email");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user.following);
  } catch (error) {
    console.log("Error in getFollowing:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Send follow request
router.post("/request/:id", protectRoute, async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.id;

    if (!senderId || !receiverId) {
      return res.status(400).json({ message: "Invalid request parameters" });
    }

    if (senderId.toString() === receiverId) {
      return res.status(400).json({ message: "You cannot request to follow yourself." });
    }

    const [sender, receiver] = await Promise.all([
      User.findById(senderId),
      User.findById(receiverId)
    ]);

    if (!receiver || !sender) {
      return res.status(404).json({ message: "User not found." });
    }

    if (sender.following.includes(receiverId)) {
      return res.status(400).json({ message: "Already following this user." });
    }

    if (receiver.followRequests.includes(senderId)) {
      return res.status(400).json({ message: "Follow request already sent." });
    }

    receiver.followRequests.push(senderId);
    await receiver.save();

    const io = req.app.get("io");
    if (io) {
      io.to(receiverId).emit("follow-request", {
        userId: senderId,
        username: sender.username,
        fullName: sender.fullName,
        profilePic: sender.profilePic
      });
    }

    res.status(200).json({
      message: "Follow request sent successfully",
      receiver: {
        _id: receiver._id,
        username: receiver.username,
        fullName: receiver.fullName
      }
    });
  } catch (error) {
    console.error("Error in follow request:", error);
    res.status(500).json({ message: "Failed to send follow request" });
  }
});

// Accept follow request
router.post("/requests/:id/accept", protectRoute, async (req, res) => {
  try {
    const requestId = req.params.id;
    const [user, requester] = await Promise.all([
      User.findById(req.user._id).select("+followRequests +followers"),
      User.findById(requestId).select("+following")
    ]);

    if (!user || !requester) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.followRequests || !user.followRequests.includes(requestId)) {
      return res.status(400).json({ message: "No follow request from this user" });
    }

    const userUpdate = {
      $pull: { followRequests: requestId },
      $addToSet: { followers: requestId }
    };

    const requesterUpdate = {
      $addToSet: { following: user._id }
    };

    await Promise.all([
      User.updateOne({ _id: user._id }, userUpdate),
      User.updateOne({ _id: requestId }, requesterUpdate)
    ]);

    const io = req.app.get("io");
    if (io) {
      io.to(requestId).emit("requestAccepted", { 
        userId: user._id,
        username: user.username,
        fullName: user.fullName,
        profilePic: user.profilePic
      });
    }

    res.status(200).json({ 
      message: "Follow request accepted",
      follower: {
        _id: requester._id,
        username: requester.username,
        fullName: requester.fullName,
        profilePic: requester.profilePic
      }
    });
  } catch (error) {
    console.error("Error accepting follow request:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Reject follow request
router.post("/requests/:id/reject", protectRoute, async (req, res) => {
  try {
    const requestId = req.params.id;
    const user = await User.findById(req.user._id).select("+followRequests");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.followRequests || !user.followRequests.includes(requestId)) {
      return res.status(400).json({ message: "No follow request from this user" });
    }

    await User.updateOne(
      { _id: user._id },
      { $pull: { followRequests: requestId } }
    );

    const io = req.app.get("io");
    if (io) {
      io.to(requestId).emit("requestRejected", { userId: user._id });
    }

    res.status(200).json({ message: "Follow request rejected" });
  } catch (error) {
    console.error("Error rejecting follow request:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Follow a user
router.post("/follow/:id", protectRoute, async (req, res) => {
  const userId = req.user._id;
  const targetId = req.params.id;
  
  if (userId === targetId) {
    return res.status(400).json({ message: "You cannot follow yourself." });
  }

  try {
    const user = await User.findById(userId).select("username following");
    const target = await User.findById(targetId).select("username followers");

    if (!user || !target) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!user.username || !target.username) {
      return res.status(400).json({ message: "Invalid user data. Username is required." });
    }

    if (user.following.includes(targetId)) {
      return res.status(400).json({ message: "Already following." });
    }

    user.following.push(targetId);
    target.followers.push(userId);

    await user.save();
    await target.save();

    const io = req.app.get("io");
    if (io) {
      io.emit("follow", { followerId: userId, followedId: targetId });
    }

    res.status(200).json({
      message: "Followed successfully.",
      followersCount: target.followers.length,
      followingCount: user.following.length
    });
  } catch (error) {
    console.error("Error in follow endpoint:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Unfollow a user
router.post("/unfollow/:id", protectRoute, async (req, res) => {
  const userId = req.user._id;
  const targetId = req.params.id;
  
  if (userId === targetId) {
    return res.status(400).json({ message: "You cannot unfollow yourself." });
  }

  try {
    const user = await User.findById(userId);
    const target = await User.findById(targetId);
    
    if (!user || !target) {
      return res.status(404).json({ message: "User not found." });
    }
    
    if (!user.following.includes(targetId)) {
      return res.status(400).json({ message: "Not following this user." });
    }
    
    user.following = user.following.filter(id => id.toString() !== targetId);
    target.followers = target.followers.filter(id => id.toString() !== userId);
    
    await user.save();
    await target.save();

    const io = req.app.get("io");
    if (io) {
      io.emit("unfollow", { unfollowerId: userId, unfollowedId: targetId });
    }

    res.status(200).json({
      message: "Unfollowed successfully.",
      followersCount: target.followers.length,
      followingCount: user.following.length
    });
  } catch (error) {
    console.error("Error in unfollow endpoint:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Delete current user
router.delete("/delete", protectRoute, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.log("Error in deleteUser controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
