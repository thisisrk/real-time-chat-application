import { useState, useEffect } from "react";
import { UserPlus, UserMinus, Search, Bell } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import FindUsersSkeleton from "../components/skeletons/FindUsersSkeleton";
import { useNavigate } from "react-router-dom";

const FindUsersPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [requests, setRequests] = useState([]);
  const { authUser, followUser, unfollowUser, isFollowing, socket } = useAuthStore();
  const { users, isUsersLoading: loading, getAllUsers } = useChatStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authUser) {
      navigate("/login");
    }
  }, [authUser, navigate]);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        await Promise.all([
          getAllUsers(),
          fetchRequests()
        ]);
        setError("");
      } catch (err) {
        setError("Failed to load data. Please try again later.");
      }
    };
    fetchInitialData();
  }, [getAllUsers]);

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    socket.on("userStatusChanged", () => {
      getAllUsers(); // Refresh user list when any user's status changes
    });

    socket.on("follow-request", () => {
      fetchRequests(); // Refresh requests when new follow request received
    });

    return () => {
      socket.off("userStatusChanged");
      socket.off("follow-request");
    };
  }, [socket, getAllUsers]);

  const fetchRequests = async () => {
    try {
      const res = await axiosInstance.get("/users/requests");
      setRequests(res.data);
    } catch (error) {
      toast.error("Failed to load requests");
    }
  };

  const handleFollowAction = async (userId) => {
    try {
      const toastId = toast.loading(isFollowing(userId) ? "Unfollowing..." : "Sending follow request...");
      if (isFollowing(userId)) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }

      // Refresh users list and requests
      await Promise.all([
        getAllUsers(),
        fetchRequests()
      ]);
      
      toast.dismiss(toastId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to process follow action");
      console.error("Error following/unfollowing user:", error);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await axiosInstance.post(`/users/requests/${requestId}/accept`);
      setRequests(prev => prev.filter(req => req._id !== requestId));
      toast.success("Request accepted");
    } catch (error) {
      toast.error("Failed to accept request");
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await axiosInstance.post(`/users/requests/${requestId}/reject`);
      setRequests(prev => prev.filter(req => req._id !== requestId));
      toast.success("Request rejected");
    } catch (error) {
      toast.error("Failed to reject request");
    }
  };

  const filteredUsers = (users || []).filter(user => {
    // Basic validation
    if (!user?.fullName || !user?.username) return false;

    // Filter out mutual followers
    if (user.isMutualFollow) return false;

    // Text search
    const fullNameMatch = user.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    const usernameMatch = user.username.toLowerCase().includes(searchQuery.toLowerCase());
    
    return (fullNameMatch || usernameMatch) && user._id !== authUser?._id;
  });

  const isRequestPending = (userId) => {
    return requests.some((req) => req._id === userId);
  };

return (
  <div className="min-h-screen pt-20 bg-base-100">
    <div className="max-w-4xl mx-auto px-4 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Find Users</h1>
        <div className="relative">
          <Bell className="w-6 h-6 cursor-pointer text-base-content" />
          {requests.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
              {requests.length}
            </span>
          )}
        </div>
      </div>

      {/* Follow Requests */}
      {requests.length > 0 && (
        <div className="bg-base-200 p-4 rounded-xl shadow space-y-4">
          <h2 className="text-lg font-semibold">Follow Requests</h2>
          {requests.map((request) => (
            <div key={request._id} className="flex justify-between items-center">
              <div className="font-medium text-base-content">@{request.username}</div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAcceptRequest(request._id)}
                  className="btn btn-success btn-sm"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRejectRequest(request._id)}
                  className="btn btn-error btn-sm"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="bg-base-200 p-6 rounded-xl shadow">
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or username..."
              className="input input-bordered w-full pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50" />
          </div>
        </div>

        {/* Loading / Error / User List */}
        {error ? (
          <div className="text-center text-error space-y-4">
            <p>{error}</p>
            <button onClick={getAllUsers} className="btn btn-error btn-sm">Try Again</button>
          </div>
        ) : loading ? (
          <FindUsersSkeleton />
        ) : filteredUsers.length > 0 ? (
          <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
            {filteredUsers.map((user) => (
              <div key={user._id} className="flex items-center justify-between p-4 bg-base-300 rounded-xl shadow">
                <div className="flex items-center gap-4">
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={user.fullName}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-medium text-lg">{user.fullName}</h3>
                    <p className="text-sm text-base-content/60">@{user.username}</p>
                    {user.bio && (
                      <p className="text-sm text-base-content/70 mt-1 line-clamp-2">{user.bio}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleFollowAction(user._id)}
                  className={`btn btn-sm ${
                    isFollowing(user._id)
                      ? "btn-outline"
                      : isRequestPending(user._id)
                      ? "btn-disabled"
                      : "btn-primary"
                  }`}
                  disabled={isRequestPending(user._id)}
                >
                  {isFollowing(user._id) ? (
                    <>
                      <UserMinus className="w-4 h-4" /> Unfollow
                    </>
                  ) : isRequestPending(user._id) ? (
                    "Requested"
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" /> Follow
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-base-content/60">
            {searchQuery ? "No users found matching your search." : "No users to display."}
          </div>
        )}
      </div>
    </div>
  </div>
);

};

export default FindUsersPage;