import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";
import { axiosInstance } from "../lib/axios";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id);
      subscribeToMessages(selectedUser._id);

      return () => unsubscribeFromMessages(selectedUser._id);
    }
  }, [selectedUser?._id]);

  useEffect(() => {
    if (messageEndRef.current && messages.length > 0) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const markStatuses = async () => {
      for (const message of messages) {
        if (message.senderId === selectedUser._id) {
          try {
            if (message.status === "sent") {
              await axiosInstance.patch(`/messages/status/${message._id}`, { status: "delivered" });
            } else if (message.status === "delivered") {
              await axiosInstance.patch(`/messages/status/${message._id}`, { status: "read" });
            }
          } catch (error) {
            console.error("Error updating message status:", error);
          }
        }
      }
    };

    markStatuses();
    const intervalId = setInterval(markStatuses, 5000);

    return () => clearInterval(intervalId);
  }, [messages, selectedUser]);

  useEffect(() => {
    // When chat is open, mark all messages from selectedUser as read in batch
    const markAllRead = async () => {
      if (!selectedUser) return;
      try {
        await axiosInstance.post("/messages/mark-all-read", { senderId: selectedUser._id });
      } catch (e) { /* ignore */ }
    };
    markAllRead();
  }, [selectedUser]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
            ref={index === messages.length - 1 ? messageEndRef : null}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>
            <div className="chat-bubble flex flex-col">
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.text && <p>{message.text}</p>}
              {message.senderId === authUser._id && (
                <span className="mt-1 flex justify-end">
                  <span className="flex gap-0.5">
                    <span
                      className={`block w-2 h-2 rounded-full ${message.status === "sent" ? "bg-red-500" : "bg-gray-300"}`}
                      title="Sent"
                    />
                    <span
                      className={`block w-2 h-2 rounded-full ${message.status === "delivered" ? "bg-yellow-400" : "bg-gray-300"}`}
                      title="Delivered"
                    />
                    <span
                      className={`block w-2 h-2 rounded-full ${message.status === "read" ? "bg-green-500" : "bg-gray-300"}`}
                      title="Read"
                    />
                  </span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;