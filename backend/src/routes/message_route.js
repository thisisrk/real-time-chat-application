import express from "express";
import { protectRoute } from "../middleware/auth_middleware.js";
import {getUsersForSidebar} from "../controllers/message_controller.js";
import {getMessages} from "../controllers/message_controller.js";
import {sendMessage} from "../controllers/message_controller.js";
import { updateMessageStatus } from "../controllers/message_controller.js";
import { markAllAsRead } from "../controllers/message_controller.js";
const messageRoutes = express.Router();

messageRoutes.get("/users", protectRoute, getUsersForSidebar);
messageRoutes.get("/:id", protectRoute, getMessages);

messageRoutes.post("/send/:id", protectRoute, sendMessage);
messageRoutes.patch("/status/:messageId", protectRoute, updateMessageStatus);
messageRoutes.post("/mark-all-read", protectRoute, markAllAsRead);

export default messageRoutes;