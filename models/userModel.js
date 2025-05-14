const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide your name"],
      trim: true,
      minLength: 5,
      maxLength: 50,
      index: true,
    },
    username: {
      type: String,
      required: [true, "Please provide username"],
      unique: true,
      trim: true,
      minLength: 5,
      maxLength: 30,
      index: true,
    },
    email: {
      type: String,
      required: [true, "Please provide email"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Please provide password"],
      minLength: 8,
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "Please confirm your password"],
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: "Passwords do not match",
      },
    },
    profilePicture: {
      type: String,
    },
    bio: {
      type: String,
      maxLength: 150,
      default: "",
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId, // special type
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId, // special type
        ref: "User",
      },
    ],
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId, // special type
        ref: "Post",
      },
    ],
    savedPosts: [
      {
        type: mongoose.Schema.Types.ObjectId, // special type
        ref: "Post",
      },
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    resetPasswordOTP: {
      type: String,
      default: null,
    },
    resetPasswordOTPExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // Ensures virtuals appear in API responses
    toObject: { virtuals: true },
  }
);

// VIRTUAL FIELD FOR POST COUNT
userSchema.virtual("postCount").get(function () {
  return this.posts ? this.posts.length : 0;
});

// ENCRYPT PASSWORD
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.correctPassword = async function (
  userPassword,
  databasePassword
) {
  return await bcrypt.compare(userPassword, databasePassword);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
