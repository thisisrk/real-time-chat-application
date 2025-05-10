   import { X, UserMinus } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const UsersListModal = ({ isOpen, onClose, users, title, isLoading = false, showUnfollow = false, onUnfollow }) => {
  const { authUser } = useAuthStore();
  
  if (!isOpen) return null;

  const handleUnfollow = async (userId) => {
    try {
      await onUnfollow(userId);
      toast.success("User unfollowed successfully");
    } catch (error) {
      toast.error("Failed to unfollow user");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-base-200 rounded-lg w-[95%] max-w-md p-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-base-content/60 py-8">No users to display</p>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user._id} className="flex items-center justify-between p-2 hover:bg-base-300 rounded-lg">
                  <div className="flex items-center gap-3">
                    <img
                      src={user.profilePic || "/avatar.png"}
                      alt={user.fullName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <h4 className="font-medium">{user.fullName}</h4>
                      <p className="text-sm text-base-content/60">@{user.username}</p>
                    </div>
                  </div>
                  {showUnfollow && title === "Following" && user._id !== authUser._id && (
                    <button 
                      onClick={() => handleUnfollow(user._id)}
                      className="btn btn-ghost btn-sm text-error hover:bg-error/20"
                    >
                      <UserMinus className="w-4 h-4" />
                      Unfollow
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersListModal;
