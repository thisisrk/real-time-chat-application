import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  followers: [],
  following: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },
  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });    } catch (error) {
      if (error.response?.status === 403) {
        toast.error(`Must follow each other to chat`, { 
          duration: 2000,
          position: 'bottom-center',
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        });
        set({ messages: [] });
      } else {
        toast.error(error.response?.data?.message || 'Failed to load messages');
      }
      console.error('Error fetching messages:', error.response?.data);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages, users } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      
      // Get socket to emit message
      const socket = useAuthStore.getState().socket;
      const authUser = useAuthStore.getState().authUser;
      
      if (socket) {
        socket.emit("new_message", {
          message: res.data,
          from: authUser._id,
          to: selectedUser._id
        });
      }

      // Update local state
      set({ 
        messages: [...messages, res.data],
        // Move the user to top of the list after sending a message
        users: [
          selectedUser,
          ...users.filter(user => user._id !== selectedUser._id)
        ]
      });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
      console.log("Error sending message: ", error.message);
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("newMessage", (newMessage) => {
      const { users, selectedUser, messages } = get();
      
      // Find the user in our list
      const messageUser = users.find(u => u._id === newMessage.senderId);
      
      // If this is from our currently selected chat, add the message
      if (selectedUser?._id === newMessage.senderId) {
        set({
          messages: [...messages, newMessage]
        });
      }

      // Always move the sender to top of users list
      if (messageUser) {
        set({
          users: [
            messageUser,
            ...users.filter(user => user._id !== messageUser._id)
          ]
        });
      }
    });

    // Listen for message status updates
    socket.on("messageStatusUpdate", ({ messageId, status }) => {
      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId ? { ...msg, status } : msg
        ),
      });
    });

    // Listen for bulk read status updates
    socket.on("bulkReadStatusUpdate", ({ from }) => {
      set({
        messages: get().messages.map((msg) =>
          msg.senderId === from ? { ...msg, status: "read" } : msg
        ),
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messageStatusUpdate");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),

  // Get all users
  getAllUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch users");
      throw error;
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // Get user's followers
  getFollowers: async (userId) => {
    try {
      const res = await axiosInstance.get(`/users/followers/${userId}`);
      set({ followers: res.data });
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch followers");
      return [];
    }
  },

  // Get user's following list
  getFollowing: async (userId) => {
    try {
      const res = await axiosInstance.get(`/users/following/${userId}`);
      set({ following: res.data });
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch following");
      return [];
    }
  },
  // Get chat users who are being followed
  getChatUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const authUserId = useAuthStore.getState().authUser?._id;
      const [chatUsers, following] = await Promise.all([
        axiosInstance.get("/messages/users"),
        axiosInstance.get(`/users/following/${authUserId}`)
      ]);
      
      // Filter chat users to only include followed users
      const followingIds = following.data.map(user => user._id);
      const filteredUsers = chatUsers.data.filter(user => followingIds.includes(user._id));
      
      set({ users: filteredUsers });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch chat users");
    } finally {
      set({ isUsersLoading: false });
    }
  },
  // Socket event subscription
  subscribeToFollowEvents: (userId) => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("newFollower", async ({ followerId }) => {
      const { followers } = get();
      const existingFollower = followers.find(f => f._id === followerId);
      if (!existingFollower) {
        try {
          const res = await axiosInstance.get(`/users/${followerId}`);
          set({ 
            followers: [...followers, res.data],
            followerCount: followers.length + 1
          });
        } catch (error) {
          toast.error("Failed to fetch new follower data.");
          console.error("Error fetching new follower data:", error);
        }
      }
    });

    socket.on("unfollowed", ({ unfollowerId }) => {
      const { followers } = get();
      const updatedFollowers = followers.filter(f => f._id !== unfollowerId);
      set({ 
        followers: updatedFollowers,
        followerCount: updatedFollowers.length 
      });
    });

    socket.on("unfollow", ({ unfollowerId, unfollowedId }) => {
      // If I'm the unfollowed user, update my followers
      if (unfollowedId === userId) {
        set(state => ({
          followers: state.followers.filter(follower => follower._id !== unfollowerId)
        }));
      }
      // If I'm the unfollower, update my following
      if (unfollowerId === userId) {
        set(state => ({
          following: state.following.filter(user => user._id !== unfollowedId)
        }));
      }
    });    socket.on("mutualUnfollow", ({ initiatorId, otherUserId, initiatorName, otherUserName }) => {
      const authUser = useAuthStore.getState().authUser;
      
      // Update followers/following lists
      set(state => {
        const newState = { ...state };
        
        // If I'm involved in the unfollow (either as initiator or other user)
        if (authUser._id === initiatorId || authUser._id === otherUserId) {
          const otherUserId = authUser._id === initiatorId ? otherUserId : initiatorId;
          
          // Remove from both following and followers lists
          newState.followers = state.followers.filter(user => user._id !== otherUserId);
          newState.following = state.following.filter(user => user._id !== otherUserId);
          
          // Show appropriate toast message
          if (authUser._id === initiatorId) {
            toast.info(`Mutual unfollow: You and ${otherUserName} are no longer following each other`);
          } else {
            toast.info(`${initiatorName} unfollowed you, mutual unfollow applied`);
          }
        }

        // If we were in a chat with this user, close it
        if (state.selectedUser && 
            (state.selectedUser._id === unfollowerId || state.selectedUser._id === unfollowedId)) {
          newState.selectedUser = null;
          newState.messages = [];
          toast.info("Chat closed: Users are no longer following each other");
        }

        return newState;
      });

      // Update auth user's following/followers count
      useAuthStore.setState(state => {
        if (!state.authUser) return state;

        const newAuthUser = { ...state.authUser };
        if (unfollowerId === authUser._id) {
          newAuthUser.followingCount = (newAuthUser.followingCount || 0) - 1;
        }
        if (unfollowedId === authUser._id) {
          newAuthUser.followersCount = (newAuthUser.followersCount || 0) - 1;
        }

        return { ...state, authUser: newAuthUser };
      });
    });

    return () => {
      if (socket) {
        socket.off("unfollow");
      }
    };
  },

  // Helper function to get the socket instance
  getSocket: () => {
    return useAuthStore.getState().socket;
  },
}));