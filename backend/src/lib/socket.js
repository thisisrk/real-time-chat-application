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