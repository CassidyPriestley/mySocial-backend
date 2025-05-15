const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const globalErrorHandler = require("./controllers/errorController");
const path = require("path");
const AppError = require("./utils/appError");
const userRouter = require("./routes/userRoutes");
const postRouter = require("./routes/postRoutes");

const app = express();

app.use("/", express.static("uploads"));
app.use(cookieParser());
app.use(helmet());
app.use(
  cors({
    origin: ["http://localhost:3000", "https://cassidy-mysocial.netlify.app"], // add vercel frontend url
    credentials: true,
  })
);
app.use(express.static(path.join(__dirname, "public")));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(express.json({ limit: "10kb" }));
app.use(mongoSanitize());

// USERS ROUTES: localhost:8000/api/v1/users/signup
app.use("/api/v1/users", userRouter);

// POST ROUTES: localhost:8000/api/v1/notification
app.use("/api/v1/posts", postRouter);

// UNDEFINED ROUTES
app.all("*", (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});
app.use(globalErrorHandler);

module.exports = app;
