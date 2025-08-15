const express = require("express");
const {
  createPost,
  getPosts,
  deletePost,
  updatePost,
  getSinglePost,
} = require("../controllers/postController");
const authentication = require("../middlewares/authMiddleware");
const upload = require("../utils/multer");
const multiUpload = upload.fields([
  { name: "previewPix", maxCount: 1 },
  { name: "detailPix", maxCount: 1 },
]);
const route = express.Router();
route.post("/post", authentication, multiUpload, createPost);
route.get("/post", getPosts);
route.get("/post/:postId", getSinglePost);
route.delete("/post/:postId", authentication, deletePost);
route.put("/post/:postId/", authentication, multiUpload, updatePost);
module.exports = route;
