const express = require("express");
const authentication = require("../middlewares/authMiddleware");
const {
  postComment,
  getAllComments,
  deleteComment,
  updateComment,
  getPostsComments,
} = require("../controllers/commentController");
const route = express.Router();
route.post("/post/:postId/comment", authentication, postComment);
route.get("/post/:postId/comments", getPostsComments);
route.delete("/comment/:commentId", authentication, deleteComment);
route.put("/comment/:commentId", authentication, updateComment);
module.exports = route;
