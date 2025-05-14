const express = require("express");
const isAuthenticated = require("../middleware/isAuthenticated");
const upload = require("../middleware/multer");
const {
  createPost,
  getAllPosts,
  getUserPosts,
  saveOrUnsave,
  deletePost,
  likeOrDislikePost,
  addComment,
  getPostById,
} = require("../controllers/postController");

const router = express.Router();

// POST ROUTES
router.post(
  "/create-post",
  isAuthenticated,
  upload.single("image"),
  createPost
);
router.get("/all-posts", getAllPosts);
router.get("/user-post/:id", getUserPosts);
router.get("/post/:id", getPostById);
router.post("/save-unsave-post/:postId", isAuthenticated, saveOrUnsave);
router.delete("/delete-post/:id", isAuthenticated, deletePost);
router.post("/like-dislike/:id", isAuthenticated, likeOrDislikePost);
router.post("/comment/:id", isAuthenticated, addComment);
module.exports = router;
