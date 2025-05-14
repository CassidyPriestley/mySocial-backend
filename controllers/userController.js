const User = require("../models/userModel");
const Post = require("../models/postModel");
const Comment = require("../models/commentModel");
const Notification = require("../models/notificationModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const getDataUri = require("../utils/dataUri");
const createNotification = require("../utils/createNotification");
const { uploadToCloudinary } = require("../utils/cloudinary");

// GET USER PROFILE
exports.getProfile = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id)
    .select(
      "-password -otp -otpExpires -resetPasswordOTP -resetPasswordOTPExpires -passwordConfirm"
    )
    .populate({
      path: "posts",
      options: { sort: { createdAt: -1 } }, //sorting in descending order
    })
    .populate({
      path: "savedPosts",
      options: {
        sort: { createdAt: -1 },
      },
    });

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

// EDIT PROFILE
exports.editProfile = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const { bio } = req.body;
  const profilePicture = req.file;

  let cloudResponse;

  if (profilePicture) {
    const fileUri = getDataUri(profilePicture);
    cloudResponse = await uploadToCloudinary(fileUri);
  }

  const user = await User.findById(userId).select("-password");

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  if (bio) user.bio = bio;
  if (profilePicture) user.profilePicture = cloudResponse.secure_url;

  await user.save({ validateBeforeSave: false });

  return res.status(200).json({
    message: "Profile updated successfully",
    status: "success",
    data: {
      user,
    },
  });
  console.log(bio);
});

// SUGGESTED USERS
exports.suggestedUser = catchAsync(async (req, res, next) => {
  const loginUserId = req.user.id;

  const users = await User.find({ _id: { $ne: loginUserId } }).select(
    "-password -otp -otpExpires -resetPasswordOTP -resetPasswordOTPExpires -passwordConfirm"
  );

  res.status(200).json({
    status: "success",
    data: {
      users,
    },
  });
});

// FOLLOW & UNFOLLOW
exports.followUnfollow = catchAsync(async (req, res, next) => {
  const loginUserId = req.user._id;
  const targetUserId = req.params.id; // the person to follow or unfollow

  if (loginUserId.toString() === targetUserId) {
    return next(new AppError("You cannot follow or unfollow yourself", 400));
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    return next(new AppError("User not found", 404));
  }

  // Check if logged in user is following this user or not
  const isFollowing = targetUser.followers.includes(loginUserId);

  if (isFollowing) {
    await Promise.all([
      User.updateOne(
        { _id: loginUserId },
        { $pull: { following: targetUserId } }
      ),
      User.updateOne(
        { _id: targetUser },
        { $pull: { followers: loginUserId } }
      ),
    ]);
  } else {
    await Promise.all([
      User.updateOne(
        { _id: loginUserId },
        { $addToSet: { following: targetUserId } }
      ),
      User.updateOne(
        { _id: targetUserId },
        { $addToSet: { followers: loginUserId } }
      ),
    ]);

    await createNotification({
      sender: loginUserId,
      receiver: targetUserId,
      type: "follow",
    });
  }

  const updatedLoggedInUser = await User.findById(loginUserId).select(
    "-password"
  );

  res.status(200).json({
    message: isFollowing ? "Unfollowed successfully" : "Followed successfully",
    status: "success",
    data: {
      user: updatedLoggedInUser,
    },
  });
});

// GET LOGGED IN USER'S PROFILE
exports.getMe = catchAsync(async (req, res, next) => {
  const user = req.user;
  if (!user) {
    return next(new AppError("User not authenticated", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Authenticated user",
    data: {
      user,
    },
  });
});

// SEARCH USER BY USERNAME
exports.searchUser = catchAsync(async (req, res, next) => {
  const { query } = req.query;

  if (!query) {
    return next(new AppError("Search query is required", 400));
  }

  // Search for users whose usernames match the query (case-sensative)
  const users = await User.find({
    username: { $regex: query, $options: "i" },
  }).select("username name profilePicture following followers ppostCount");

  res.status(200).json({
    status: "success",
    data: {
      users,
    },
  });
});

// DELETE ACCOUNT
exports.deleteAccount = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Get IDs of posts and comments made by the user
  const userPosts = await Post.find({ user: userId }).distinct("_id");
  const userComments = await Comment.find({ user: userId }).distinct("_id");

  await Promise.all([
    Post.deleteMany({ user: userId }), // Delete all posts by user
    Comment.deleteMany({ user: userId }), // Delete comments made by user
    Comment.deleteMany({ post: { $in: userPosts } }), // Delete comments on user's posts
    Notification.deleteMany({ receiver: userId }), // Delete received notifications
    Notification.deleteMany({ sender: userId }), // Delete sent notifications
    Notification.deleteMany({ post: { $in: userPosts } }), // Delete notifications related to user's posts
    User.updateMany({ following: userId }, { $pull: { following: userId } }), // Remove from followers
    User.updateMany({ followers: userId }, { $pull: { followers: userId } }), // Remove from following
    Post.updateMany({ likes: userId }, { $pull: { likes: userId } }), // Remove the user's likes from all posts
    Post.updateMany(
      { comments: { $in: userComments } },
      { $pull: { comments: { $in: userComments } } }
    ), // Remove user's comments from posts
  ]);

  await User.findByIdAndDelete(userId);

  res.status(200).json({
    status: "success",
    message: "Account deleted successfully",
  });
});
