const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const sharp = require("sharp");
const Post = require("../models/postModel");
const User = require("../models/userModel");
const Comment = require("../models/commentModel");
const { uploadToCloudinary, cloudinary } = require("../utils/cloudinary");
const createdNotification = require("../utils/createNotification");

exports.createPost = catchAsync(async (req, res, next) => {
  const { caption } = req.body;
  const image = req.file;
  const userId = req.user._id;

  if (!image) return next(new AppError("Image is required for the post", 400));

  // OPTIMIZE IMAGE: Using Sharp
  const optimizeImageBuffer = await sharp(image.buffer)
    .resize({
      width: 800,
      height: 800,
      fit: "inside",
    })
    .toFormat("jpeg", { quality: 80 })
    .toBuffer();

  const fileUri = `data:image/jpeg;base64,${optimizeImageBuffer.toString(
    "base64"
  )}`;

  const cloudResponse = await uploadToCloudinary(fileUri);

  // ACTUAL POST
  let post = await Post.create({
    caption,
    image: {
      url: cloudResponse.secure_url,
      publicId: cloudResponse.public_id,
    },
    user: userId,
  });

  // ADD POST TO USER'S POST (FEED)
  const user = await User.findById(userId);
  if (user) {
    user.posts.push(post.id);
    await user.save({ validateBeforeSave: false });
  }

  post = await post.populate({
    path: "user",
    select: "username email bio profilePicture",
  });

  return res.status(201).json({
    status: "success",
    message: "Post created successfully",
    data: {
      post,
    },
  });
});

exports.getAllPosts = catchAsync(async (req, res, next) => {
  const posts = await Post.find()
    .populate({
      path: "user",
      select:
        "username name profilePicture bio followers following posts postCount",
    })
    .populate({
      path: "comments",
      select: "text user",
      populate: {
        path: "user",
        select: "username profilePicture",
        match: { _id: { $ne: null } }, // Only include comments where user is NOT null
      },
    })
    .sort({ createdAt: -1 });

  return res.status(200).json({
    status: "success",
    results: posts.length,
    data: {
      posts,
    },
  });
});

exports.getUserPosts = catchAsync(async (req, res, next) => {
  const userId = req.params.id;

  const posts = await Post.find({ user: userId })
    .populate({
      path: "comments",
      select: "text user",
      populate: {
        path: "user",
        select: "username profilePicture postCount",
        match: { _id: { $ne: null } }, // Only include comments where user is NOT null
      },
    })
    .sort({ createdAt: -1 });

  return res.status(200).json({
    status: "success",
    results: posts.length,
    data: {
      posts,
    },
  });
});

exports.getPostById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const post = await Post.findById(id)
    .populate({
      path: "user",
      select: "username name profilePicture bio followers following",
    })
    .populate({
      path: "comments",
      select: "text user createdAt",
      populate: {
        path: "user",
        select: "username profilePicture",
      },
    });

  if (!post) {
    return next(new AppError("Post not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      post,
    },
  });
});

exports.saveOrUnsave = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const postId = req.params.postId;

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError("user not found", 404));
  }

  // check if posts is already saved in user saved post list
  const isPostSaved = user.savedPosts.includes(postId);
  if (isPostSaved) {
    user.savedPosts.pull(postId);
    await user.save({ validateBeforeSave: false });
    return res.status(200).json({
      status: "success",
      message: "Post unsaved successfully.",
      data: {
        user,
      },
    });
  } else {
    user.savedPosts.push(postId);
    await user.save({ validateBeforeSave: false });

    // added notification
    const post = await Post.findById(postId);
    if (post.user.toString() !== userId.toString()) {
      await createdNotification({
        sender: userId,
        receiver: post.user,
        post: postId,
        type: "save",
      });
    }
    // end of notification
    return res.status(200).json({
      status: "success",
      message: "Post saved successfully.",
      data: {
        user,
      },
    });
  }
});

exports.deletePost = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  // Find the post &populate the user
  const post = await Post.findById(id).populate("user");

  if (!post) {
    return next(new AppError("Post not found", 404));
  }

  if (post.user.id.toString() !== userId.toString()) {
    return next(
      new AppError("You are not authorized to delete this post", 403)
    );
  }

  // Remove post from user's post array
  await User.updateOne({ _id: userId }, { $pull: { posts: id } });

  // Remove posts from user's saved list
  await User.updateMany({ savedPosts: id }, { $pull: { savedPosts: id } });

  // Remove the comment from this posts
  await Comment.deleteMany({ post: id });

  // Remove image from cloudinary
  if (post.image.publicId) {
    await cloudinary.uploader.destroy(post.image.publicId);
  }

  // Remove the actual post (FINAL BOSS)
  await Post.findByIdAndDelete(id);

  res.status(200).json({
    status: "success",
    message: "Post deleted successfully.",
  });
});

exports.likeOrDislikePost = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  // Find the post using the post id
  const post = await Post.findById(id);
  if (!post) return next(new AppError("Post not found", 404));

  // Check if post is already like ot not
  // If post.likes has the userId, the user liked the post already
  const isLiked = post.likes.includes(userId);
  if (isLiked) {
    // Removing the like
    await Post.findByIdAndUpdate(
      id,
      { $pull: { likes: userId } },
      { new: true }
    );

    return res.status(200).json({
      status: "success",
      message: "Post disliked successfully.",
    });
  } else {
    await Post.findByIdAndUpdate(
      id,
      { $addToSet: { likes: userId } },
      { new: true }
    );
    // notification
    if (post.user.toString() !== userId.toString()) {
      await createdNotification({
        sender: userId,
        reciever: post.user,
        post: id,
        type: "like",
      });
    }
    // notification end
    return res.status(200).json({
      status: "success",
      message: "Post liked successfully.",
    });
  }
});

exports.addComment = catchAsync(async (req, res, next) => {
  const { id: postId } = req.params;
  const userId = req.user._id;

  // Get the comment text
  const { text } = req.body;

  // Find the post
  const post = await Post.findById(postId);

  if (!post) return next(new AppError("Post not found.", 404));
  if (!text) return next(new AppError("Comment text is required.", 400));

  const comment = await Comment.create({
    text,
    user: userId,
    createdAt: Date.now(),
  });

  post.comments.push(comment);
  await post.save({ validateBeforeSave: false });

  await comment.populate({
    path: "user",
    select: "username profilePicture bio",
  });

  // notification
  if (post.user.toString() !== userId.toString()) {
    await createdNotification({
      sender: userId,
      receiver: post.user,
      post: postId,
      comment: comment._id,
      type: "comment",
    });
  }
  // notification end

  res.status(201).json({
    status: "success",
    message: "Comment added successfully.",
    data: {
      comment,
    },
  });
});
