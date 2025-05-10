import { Server } from "socket.io";

const userSocketMap = new Map();

// Helper function to get receiver's socket id
export const getReceiverSocketId = (userId) => {
  return userSocketMap.get(userId);
};

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Handle user connection
    socket.on("user_connected", (userId) => {
      userSocketMap.set(userId, socket.id);
      io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
    });

    // Handle follow requests
    socket.on("follow_request", ({ from, to }) => {
      const targetSocketId = userSocketMap.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit("new_follow_request", { from });
      }
    });

    // Handle follow events
    socket.on("follow", ({ followerId, followedId }) => {
      const targetSocketId = userSocketMap.get(followedId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("newFollower", { followerId });
      }
    });

    // Handle unfollow events
    socket.on("unfollow", ({ unfollowerId, unfollowedId }) => {
      const targetSocketId = userSocketMap.get(unfollowedId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("unfollowed", { unfollowerId });
      }
    });

    // Handle new messages
    socket.on("new_message", ({ message, from, to }) => {
      const receiverSocketId = userSocketMap.get(to);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", {
          ...message,
          senderId: from,
          receiverId: to
        });
      }
    });

    // Handle user disconnection
    socket.on("disconnect", () => {
      let disconnectedUserId;
      for (const [userId, socketId] of userSocketMap.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          break;
        }
      }
      if (disconnectedUserId) {
        userSocketMap.delete(disconnectedUserId);
        io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
      }
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};