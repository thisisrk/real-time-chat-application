import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User, Users } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "../store/useChatStore";
import UsersListModal from "../components/UsersListModal";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile, logout, unfollowUser } = useAuthStore();
  const { getFollowers, getFollowing, subscribeToFollowEvents } = useChatStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [username, setUsername] = useState(authUser?.username || "");
  const [bio, setBio] = useState(authUser?.bio || "");
  const [birthday, setBirthday] = useState(authUser?.birthday ? authUser.birthday.split("T")[0] : "");
  const [usernameError, setUsernameError] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

  const [isLoadingFollowData, setIsLoadingFollowData] = useState(false);

  useEffect(() => {
    const fetchFollowData = async () => {
      if (!authUser?._id) return;
      setIsLoadingFollowData(true);
      try {
        const [followersData, followingData] = await Promise.all([
          getFollowers(authUser._id),
          getFollowing(authUser._id)
        ]);
        setFollowers(followersData);
        setFollowing(followingData);
        setFollowerCount(followersData.length);
        setFollowingCount(followingData.length);
      } catch (error) {
        toast.error("Failed to load follow data");
      } finally {
        setIsLoadingFollowData(false);
      }
    };
    fetchFollowData();
  }, [authUser?._id, getFollowers, getFollowing]);

  useEffect(() => {
    if (authUser?._id) {
      subscribeToFollowEvents(authUser._id);
    }
  }, [authUser?._id, subscribeToFollowEvents]);

  useEffect(() => {
    const socket = useAuthStore.getState().socket;
    if (!socket || !authUser?._id) return;

    const handleUnfollow = ({ unfollowerId, unfollowedId }) => {
      // If I'm being unfollowed
      if (unfollowedId === authUser._id) {
        setFollowers(prev => prev.filter(user => user._id !== unfollowerId));
        setFollowerCount(prev => prev - 1);
      }
      
      // If someone I follow unfollowed me or someone else
      if (unfollowerId === authUser._id) {
        setFollowing(prev => prev.filter(user => user._id !== unfollowedId));
        setFollowingCount(prev => prev - 1);
      }
    };

    socket.on("unfollow", handleUnfollow);

    return () => {
      socket.off("unfollow", handleUnfollow);
    };
  }, [authUser?._id]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  const handleUpdate = async () => {
    setSaving(true);
    setUsernameError("");
    try {
      await updateProfile({ username, bio, birthday });
    } catch (err) {
      if (err.response?.data?.message?.includes("Username")) {
        setUsernameError(err.response.data.message);
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;
    try {
      await axios.delete("/api/user/delete", { withCredentials: true });
      await logout();
      navigate("/login");
    } catch (err) {
      alert("Failed to delete account");
    }
  };

  return (
    <div className="h-screen pt-20 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 py-8 space-y-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Profile</h1>
            <p className="mt-2">Your profile information</p>
          </div>

          {/* Follow Stats */}
          <div className="flex justify-center items-center gap-12">
            <button
              onClick={() => setShowFollowersModal(true)}
              className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
            >
              <span className="text-3xl font-bold">{followerCount}</span>
              <span className="text-sm text-base-content/70 flex items-center gap-1">
                <Users className="w-4 h-4" />
                Followers
              </span>
            </button>

            <button
              onClick={() => setShowFollowingModal(true)}
              className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
            >
              <span className="text-3xl font-bold">{followingCount}</span>
              <span className="text-sm text-base-content/70 flex items-center gap-1">
                <Users className="w-4 h-4" />
                Following
              </span>
            </button>
          </div>

          {/* Followers/Following Modals */}
        <UsersListModal
          isOpen={showFollowersModal}
          onClose={() => setShowFollowersModal(false)}
          users={followers}
          title="Followers"
          isLoading={isLoadingFollowData}
        />
        <UsersListModal
          isOpen={showFollowingModal}
          onClose={() => setShowFollowingModal(false)}
          users={following}
          title="Following"
          isLoading={isLoadingFollowData}
          showUnfollow={true}
          onUnfollow={async (userId) => {
            try {
              const res = await unfollowUser(userId);
              // Update local following list
              const updatedFollowing = following.filter(user => user._id !== userId);
              setFollowing(updatedFollowing);
              // Update counts
              if (res.followingCount !== undefined) {
                setFollowingCount(res.followingCount);
              } else {
                setFollowingCount(prev => prev - 1);
              }
              
              // Subscribe to follow/unfollow events to get real-time updates
              subscribeToFollowEvents(authUser._id);
            } catch (error) {
              console.error("Failed to unfollow user:", error);
              throw error;
            }
          }}
        />

          {/* avatar upload section */}

          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src={selectedImg || authUser.profilePic || "/avatar.png"}
                alt="Profile"
                className="size-32 rounded-full object-cover border-4 "
              />
              <label
                htmlFor="avatar-upload"
                className={`
                  absolute bottom-0 right-0 
                  bg-base-content hover:scale-105
                  p-2 rounded-full cursor-pointer 
                  transition-all duration-200
                  ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}
                `}
              >
                <Camera className="w-5 h-5 text-base-200" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUpdatingProfile}
                />
              </label>
            </div>
            <p className="text-sm text-zinc-400">
              {isUpdatingProfile ? "Uploading..." : "Click the camera icon to update your photo"}
            </p>
          </div>

          <div className="space-y-6">
            {/* Username */}
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                Username
              </div>
              <input
                type="text"
                className="input input-bordered w-full"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onBlur={handleUpdate}
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_]+"
                disabled={saving}
              />
              {usernameError && <p className="text-red-500 text-xs mt-1">{usernameError}</p>}
            </div>
            {/* Bio */}
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                Bio
              </div>
              <textarea
                className="textarea textarea-bordered w-full"
                value={bio}
                onChange={e => setBio(e.target.value)}
                onBlur={handleUpdate}
                maxLength={200}
                disabled={saving}
              />
            </div>
            {/* Birthday */}
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                Birthday
              </div>
              <input
                type="date"
                className="input input-bordered w-full"
                value={birthday}
                onChange={e => setBirthday(e.target.value)}
                onBlur={handleUpdate}
                disabled={saving}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
            {/* Email (readonly) */}
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border">{authUser?.email}</p>
            </div>
          </div>

          <div className="mt-6 bg-base-300 rounded-xl p-6">
            <h2 className="text-lg font-medium  mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                <span>Member Since</span>
                <span>{authUser.createdAt?.split("T")[0]}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Account Status</span>
                <span className="text-green-500">Active</span>
              </div>
            </div>
            <button
              className="btn btn-error mt-6 w-full"
              onClick={handleDelete}
              disabled={saving}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProfilePage;
