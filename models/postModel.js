const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    caption: {
      type: String,
      maxLength: [2000, "Caption should be less than 2000 characters"],
      trim: true,
    },
    image: {
      url: { type: String, required: true },
      // public id is provided by cloudinary
      publicId: {
        type: String,
        required: true,
      },
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required."],
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
  },
  { timestamps: true }
);

// Indexing posts
postSchema.index({ user: 1, createdAt: -1 });

const Post = mongoose.model("Post", postSchema);
module.exports = Post;
