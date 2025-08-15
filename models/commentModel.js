const mongoose = require("mongoose");
const commentSchema = mongoose.Schema(
  {
    text: {
      type: String,
    },
    commentedBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    post: {
      type: mongoose.Types.ObjectId,
      ref: "Post",
      required: true,
    },
  },
  { timestamps: true }
);
const commentModel = mongoose.model("Comment", commentSchema);
module.exports = commentModel;
