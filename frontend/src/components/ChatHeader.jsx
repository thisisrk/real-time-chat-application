import { X, AlertCircle, Users } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();

  const isMutualFollow = selectedUser.following?.includes(authUser._id) && authUser.following?.includes(selectedUser._id);

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
            </div>
          </div>

          {/* User info */}
          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className={onlineUsers?.includes(selectedUser._id) ? "text-success" : "text-base-content/70"}>
                {onlineUsers?.includes(selectedUser._id) ? "Online" : "Offline"}
              </span>
              {!isMutualFollow && (
                <div className="flex items-center gap-1 text-warning">
                  <AlertCircle className="w-4 h-4" />
                  <span>Must follow each other to chat</span>
                </div>
              )}
              {isMutualFollow && (
                <div className="flex items-center gap-1 text-success">
                  {/* <Users className="w-4 h-4" /> */}
                  <span><strong>M</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Close button */}
        <button onClick={() => setSelectedUser(null)} className="btn btn-ghost btn-sm btn-circle">
          <X />
        </button>
      </div>
    </div>
  );
};
export default ChatHeader;
