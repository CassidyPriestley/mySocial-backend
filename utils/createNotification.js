const Notification = require("../models/notificationModel");

const createdNotification = async ({
  sender,
  receiver,
  post,
  comment,
  type,
  isRead,
}) => {
  try {
    const notification = new Notification({
      sender,
      receiver,
      post,
      comment,
      type,
      isRead,
    });
    await notification.save();
  } catch (error) {
    console.log("Error creating notification", error);
  }
};

module.exports = createdNotification;
