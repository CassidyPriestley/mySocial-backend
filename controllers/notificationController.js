const Notification = require("../models/notificationModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.getNotifications = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const notifications = await Notification.find({ receiver: userId })
    .populate("sender", "username profilePicture")
    .populate("post", "image caption")
    .populate("comment", "text")
    .sort({ createdAt: -1 });

  if (!notifications) {
    return next(new AppError("Notification cannot be found", 404));
  }

  res.status(200).json({
    status: "success",
    data: { notifications },
  });
});

exports.markNotificationAsRead = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const updateNotificationReadStatus = await Notification.updateMany(
    { receiver: userId, isRead: false },
    { isRead: true }
  );

  if (!updateNotificationReadStatus) {
    return next(new AppError("Error updatting if notification status", 400));
  }

  res.status(200).json({
    status: "success",
    message: "Notifications marked as read",
  });
});
