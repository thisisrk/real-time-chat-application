import { useState, useEffect } from "react";
import { Users, UserPlus, UserMinus, Search } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";

const FindUsers = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { authUser, followUser, unfollowUser, isFollowing } = useAuthStore();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!showDropdown) return;
      
      setLoading(true);
      try {
        const res = await axiosInstance.get("/users");
        setUsers(res.data);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [showDropdown]);

  const handleFollowAction = async (userId) => {
    try {
      if (isFollowing(userId)) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
      // Refresh users list
      const res = await axiosInstance.get("/users");
      setUsers(res.data);
    } catch (error) {
      console.error("Error following/unfollowing user:", error);
    }
  };

  const filteredUsers = users.filter(user => {
    const fullNameMatch = user.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    const usernameMatch = user.username.toLowerCase().includes(searchQuery.toLowerCase());
    return (fullNameMatch || usernameMatch) && user._id !== authUser._id;
  });

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="btn btn-ghost btn-circle"
        title="Find Users"
      >
        <Users className="w-5 h-5" />
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 max-h-[32rem] overflow-hidden rounded-lg bg-base-200 shadow-xl z-50">
          <div className="p-4 border-b border-base-300">
            <h3 className="font-semibold mb-2">Find Users</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                className="input input-bordered w-full pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50" />
            </div>
          </div>

          <div className="overflow-y-auto max-h-[24rem]">
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <span className="loading loading-spinner"></span>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="p-2 space-y-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-2 hover:bg-base-300 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={user.profilePic || "/avatar.png"}
                        alt={user.fullName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="font-medium">{user.fullName}</h4>
                        <p className="text-sm text-base-content/60">@{user.username}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleFollowAction(user._id)}
                      className={`btn btn-sm gap-2 ${
                        isFollowing(user._id) ? "btn-ghost" : "btn-primary"
                      }`}
                    >
                      {isFollowing(user._id) ? (
                        <>
                          <UserMinus className="w-4 h-4" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Follow
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-base-content/60">
                {searchQuery ? "No users found" : "No users available"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FindUsers;