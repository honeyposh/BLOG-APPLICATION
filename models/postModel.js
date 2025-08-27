const mongoose = require("mongoose");
const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    previewPix: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    detailPix: {
      url: String,
      public_id: String,
    },
    creator: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "User",
    },
    comments: [{ type: mongoose.Types.ObjectId, ref: "Comment" }],
  },
  { timestamps: true }
);
const postModel = mongoose.model("Post", postSchema);
module.exports = postModel;
