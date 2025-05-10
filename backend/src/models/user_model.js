import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      sparse: true,
      required: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-zA-Z0-9_]+$/,
    },
    fullName: {
      type: String,
      required: true,
    },
    number: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      maxlength: 200,
      default: "",
    },
    birthday: {
      type: Date,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: null,
    },
    followers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "user"
    }],
    following: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "user"
    }],
    followRequests: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "user"
    }],

  },
  { timestamps: true }
);

// Helper methods for follow/unfollow functionality
userSchema.methods.follow = async function (userId) {
  if (!this.following.includes(userId)) {
    this.following.push(userId);
    await this.save();
  }
};

userSchema.methods.unfollow = async function (userId) {
  if (this.following.includes(userId)) {
    this.following = this.following.filter(id => id.toString() !== userId.toString());
    await this.save();
  }
};

userSchema.methods.isFollowing = function (userId) {
  return this.following.includes(userId);
};

// Virtual property for followers/following/requests count
userSchema.virtual('followersCount').get(function () {
  return this.followers ? this.followers.length : 0;
});

userSchema.virtual('followingCount').get(function () {
  return this.following ? this.following.length : 0;
});

userSchema.virtual('followRequestsCount').get(function () {
  return this.followRequests ? this.followRequests.length : 0;
});

// When converting document to JSON, include virtuals
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// Add helper method to check for pending requests
userSchema.methods.hasPendingRequestFrom = function(userId) {
  return this.followRequests && this.followRequests.some(id => id.toString() === userId.toString());
};

const User = mongoose.model("user", userSchema);

export default User;
