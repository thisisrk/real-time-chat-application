import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X, Users } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = ({ showImageButtonOnMobile }) => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage, selectedUser } = useChatStore();
  const { authUser } = useAuthStore();

  const isMutualFollow = selectedUser?.following?.includes(authUser._id) && authUser?.following?.includes(selectedUser._id);

  const handleImageChange = (e) => {
    if (!isMutualFollow) {
      toast.error("Both users must follow each other to send messages");
      return;
    }

    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    if (!isMutualFollow) {
      toast.error("Both users must follow each other to send messages");
      return;
    }

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });

      // Clear form
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error("Both users must follow each other to send messages");
      } else {
        toast.error("Failed to send message");
      }
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="p-4 w-full">
      {!isMutualFollow ? (
        <div className="flex items-center justify-center gap-2 text-warning bg-warning/10 p-3 rounded-lg">
          <Users className="w-5 h-5" />
          <p>You need to follow each other to start messaging</p>
        </div>
      ) : (
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          {/* Image preview */}
          {imagePreview && (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-16 h-16 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-1 -right-1 bg-error text-white rounded-full p-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex-1 flex items-end gap-2">
            {/* Message input */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={isMutualFollow ? "Type a message" : "Follow each other to chat"}
              rows="1"
              className="textarea textarea-bordered flex-1 resize-none"
              disabled={!isMutualFollow}
            />

            {/* Image upload button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`btn btn-circle btn-ghost ${!isMutualFollow && 'btn-disabled'}`}
              disabled={!isMutualFollow}
            >
              <Image className="w-5 h-5" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                ref={fileInputRef}
                className="hidden"
                disabled={!isMutualFollow}
              />
            </button>

            {/* Send button */}
            <button 
              type="submit" 
              className={`btn btn-circle btn-primary ${!isMutualFollow && 'btn-disabled'}`}
              disabled={!isMutualFollow || (!text.trim() && !imagePreview)}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
export default MessageInput;
