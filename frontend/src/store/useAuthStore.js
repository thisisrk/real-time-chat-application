import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
      if (get().socket) {
        get().disconnectSocket();
      }
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      localStorage.setItem("verificationEmail", data.email);
      toast.success("Account created successfully. Please verify your email.");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
      throw error;
    } finally {
      set({ isSigningUp: false });
    }
  },

  verifyOTP: async ({ email, otp }) => {
    if (!email || !otp) {
      throw new Error("Email and OTP are required");
    }

    try {
      const res = await axiosInstance.post("/auth/verify-otp", { 
        email: email.trim(),
        otp: otp.trim()
      });
      
      set({ authUser: res.data });
      get().connectSocket();
      return res.data;
    } catch (error) {
      console.error("OTP verification error:", error.response?.data);
      throw error;
    }
  },

  resendOTP: async ({ email }) => {
    if (!email) {
      throw new Error("Email is required");
    }

    try {
      const res = await axiosInstance.post("/auth/resend-otp", { email: email.trim() });
      return res.data;
    } catch (error) {
      console.error("Resend OTP error:", error.response?.data);
      throw error;
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
      throw error;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Profile update failed");
      throw error;
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  followUser: async (userId) => {
    try {
      const res = await axiosInstance.post(`/users/request/${userId}`);
      toast.success(res.data.message || "Follow request sent");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send follow request");
      throw error;
    }
  },  
  unfollowUser: async (userId) => {
    try {
      const res = await axiosInstance.post(`/users/unfollow/${userId}`);
      
      // Update the local authUser state for mutual unfollow
      set((state) => ({
        authUser: {
          ...state.authUser,
          following: state.authUser.following.filter(id => id !== userId),
          followers: state.authUser.followers.filter(id => id !== userId),
          followingCount: (state.authUser.followingCount || 0) - 1,
          followersCount: (state.authUser.followersCount || 0) - 1
        }
      }));

      // Disconnect chat if we were chatting with this user
      const selectedUser = useChatStore.getState().selectedUser;
      if (selectedUser?._id === userId) {
        useChatStore.setState({ selectedUser: null, messages: [] });
      }
      
      toast.success("Mutual unfollow completed");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to unfollow");
      throw error;
    }
  },

  isFollowing: (userId) => {
    const authUser = get().authUser;
    return authUser?.following?.includes(userId) || false;
  },

  // This method will be used to update followers/following counts
  updateFollowCounts: (counts) => {
    set(state => ({
      authUser: {
        ...state.authUser,
        followersCount: counts.followers,
        followingCount: counts.following
      }
    }));
  },

  connectSocket: () => {
    if (get().socket) return;

    const socket = io(BASE_URL, {
      query: { userId: get().authUser?._id },
      withCredentials: true,
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      if (get().authUser?._id) {
        socket.emit("user_connected", get().authUser._id);
      }
    });

    socket.on("getOnlineUsers", (users) => {
      set({ onlineUsers: users });
    });

    // Handle new follow requests
    socket.on("new_follow_request", (data) => {
      toast.success(`New follow request from ${data.fullName}`, {
        duration: 4000,
        position: "bottom-center",
        icon: "👋",
      });
      
      // You might want to update the UI to show the new request
      // This could trigger a re-fetch of requests or update the state directly
      const fetchRequests = async () => {
        try {
          const res = await axiosInstance.get("/users/requests");
          // You might want to update some state here with the new requests
          console.log("Updated requests:", res.data);
        } catch (error) {
          console.error("Failed to fetch requests:", error);
        }
      };
      
      fetchRequests();
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    set({ socket });
  },

  disconnectSocket: () => {
    if (get().socket) {
      get().socket.disconnect();
      set({ socket: null, onlineUsers: [] });
    }
  },
}));