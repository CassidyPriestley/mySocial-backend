const User = require("../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const generateOtp = require("../utils/generateOtp");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const hbs = require("hbs");
const sendEmail = require("../utils/email");

const loadTemplate = (templateName, replacements) => {
  const templatePath = path.join(__dirname, "../email", templateName);
  const source = fs.readFileSync(templatePath, "utf-8");
  const template = hbs.compile(source);
  return template(replacements);
};

// SIGN TOKEN
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// CREATE SEND TOKEN
const createSendToken = (user, statusCode, res, message) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "Lax",
  };

  res.cookie("token", token, cookieOptions);
  user.password = undefined;
  user.otp = undefined;
  res
    .status(statusCode)
    .json({ status: "success", message, token, data: { user } });
};

// SIGNUP
exports.signup = catchAsync(async (req, res, next) => {
  const { email, password, passwordConfirm, username, name } = req.body;
  const existingUser = await User.findOne({ email });
  const existingUsername = await User.findOne({ username });

  if (existingUser) {
    return next(new AppError("Email already registered", 400));
  }

  if (existingUsername) {
    return next(new AppError("Username already in use, try another one", 400));
  }

  const otp = generateOtp();
  // Expires in 24 hours
  const otpExpires = Date.now() + 24 * 60 * 60 * 1000;
  const newUser = await User.create({
    name,
    username,
    email,
    password,
    passwordConfirm,
    otp,
    otpExpires,
  });

  const htmlTemplate = loadTemplate("otpTemplate.hbs", {
    title: "OTP Verification",
    username: newUser.username,
    otp,
    message: "Your one time password (OTP) for account verification is",
  });

  try {
    await sendEmail({
      email: newUser.email,
      subject: "OTP Email Verification",
      html: htmlTemplate,
    });
    createSendToken(
      newUser,
      200,
      res,
      "Registration Successful. Check your email for otp verification."
    );
  } catch (error) {
    // If email does not get sent
    await User.findByIdAndDelete(newUser.id);
    return next(
      new AppError(
        "There is an error creating this account. Please try again later.",
        500
      )
    );
  }
});

exports.verifyAccount = catchAsync(async (req, res, next) => {
  const { otp } = req.body;
  if (!otp) {
    return next(new AppError("OTP required for verification", 400));
  }

  const user = req.user;

  if (user.otp !== otp) {
    return next(new AppError("Invalid OTP", 400));
  }

  if (Date.now() > user.otpExpires) {
    // check if otp is expired
    return next(
      new AppError("OTP has expired. Please request a new one.", 400)
    );
  }

  // if everything works
  user.isVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;

  await user.save({ validateBeforeSave: false });

  createSendToken(user, 200, res, "Email has been verified.");
});

exports.resendOtp = catchAsync(async (req, res, next) => {
  const { email } = req.user;
  if (!email) {
    return next(new AppError("Email is required.", 400));
  }

  const user = await User.findOne({ email });

  if (!user) {
    return next(new AppError("User not found.", 404));
  }

  if (user.isVerified) {
    return next(new AppError("This account is already verified.", 400));
  }

  const otp = generateOtp();
  const otpExpires = Date.now() + 24 * 60 * 60 * 1000;

  user.otp = otp;
  user.otpExpires = otpExpires;

  await user.save({ validateBeforeSave: false });

  const htmlTemplate = loadTemplate("otpTemplate.hbs", {
    title: "OTP Verification",
    username: user.username,
    otp,
    message: "Your new one time password (OTP) for account verification is",
  });

  try {
    await sendEmail({
      email: user.email,
      subject: "Resend OTP for email verification",
      html: htmlTemplate,
    });

    res.status(200).json({
      status: "success",
      message: "A new OTP was sent to your email",
    });
  } catch (error) {
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError("There is an error sending email, try again.", 500)
    );
  }
});

// LOGIN
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError("Please provide an email and password", 400));
  }

  const user = await User.findOne({ email }).select("+password");
  // use jwt to compare the passwords
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  createSendToken(user, 200, res, "Login Successful");
});

// LOGOUT
exports.logout = catchAsync(async (req, res, next) => {
  // REMOVE COOKIE
  res.cookie("token", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  res.status(200).json({
    status: "success",
    message: "Logged out successfully.",
  });
});

// FORGOT PASSWORD
exports.forgetPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return next(new AppError("No User found", 404));
  }

  const otp = generateOtp();
  const resetExpires = Date.now() + 300000; // after 5 mins otp expires

  user.resetPasswordOTP = otp;
  user.resetPasswordOTPExpires = resetExpires;

  await user.save({ validateBeforeSave: false });

  // send otp to user using email
  const htmlTemplate = loadTemplate("otpTemplate.hbs", {
    title: "Reset Password OTP",
    username: user.username,
    otp,
    message: "Your password reset OTP is",
  });

  try {
    await sendEmail({
      email: user.email,
      subject: "Password Reset OTP (valid for 5 minutes)",
      html: htmlTemplate,
    });

    res.status(200).json({
      status: "success",
      message: "Password reset OTP has been sent to your email.",
    });
  } catch (error) {
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        "There was an error sending the email, try again later.",
        500
      )
    );
  }
});

// RESET PASSWORD
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { email, otp, password, passwordConfirm } = req.body;
  const user = await User.findOne({
    email,
    resetPasswordOTP: otp,
    resetPasswordOTPExpires: { $gt: Date.now() },
  });
  if (!user) {
    return next(new AppError("No user found", 400));
  }

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.resetPasswordOTP = undefined;
  user.resetPasswordOTPExpires = undefined;

  await user.save();
  createSendToken(user, 200, res, "Password reset successful!");
});

// USER CHANGE PASSWORD
exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, newPasswordConfirm } = req.body;

  const { email } = req.user;

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(new AppError("Incorrect current password", 400));
  }

  if (newPassword !== newPasswordConfirm) {
    return next(
      new AppError(
        "User's new password and confirm password are not the same",
        400
      )
    );
  }

  user.password = newPassword;
  user.passwordConfirm = newPasswordConfirm;
  await user.save();
  createSendToken(user, 200, res, "Password changed successfully");
});
