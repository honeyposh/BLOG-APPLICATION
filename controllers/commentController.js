const commentModel = require("../models/commentModel");
const postModel = require("../models/postModel");
const userModel = require("../models/userModel");
exports.postComment = async (req, res, next) => {
  const { postId } = req.params;
  const { text } = req.body;
  try {
    if (!req.user.id) {
      const error = new Error("Please login to make a comment");
      error.status = 400;
      next(error);
    }
    const comment = await commentModel.create({
      text,
      commentedBy: req.user.id,
      post: postId,
    });
    await postModel.findByIdAndUpdate(
      postId,
      {
        $push: { comments: comment._id },
      },
      { new: true, runValidators: true }
    );
    await userModel.findByIdAndUpdate(
      req.user.id,
      {
        $push: { comments: comment._id },
      },
      { new: true, runValidators: true }
    );
    return res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
};
exports.getAllComments = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const post = await postModel.findById(postId).populate("comments", "text");
    if (!post) {
      const error = new Error("post not found");
      error.status = 404;
      return next(error);
    }
    if (post.comments.length == 0) {
      const error = new Error("no comment found");
      error.status = 404;
      return next(error);
    }
    const comments = post.comments;
    return res.status(200).json(comments);
  } catch (error) {
    next(error);
  }
};
exports.deleteComment = async (req, res, next) => {
  const { id, admin } = req.user;
  const { commentId } = req.params;
  try {
    const comment = await commentModel.findById(commentId);
    if (!comment) {
      const error = new Error("Comment not found");
      error.status = 404;
      return next(error);
    }
    if (!admin && comment.commentedBy.toString() !== id) {
      const error = new Error("you cant delete this comment");
      error.status = 401;
      return next(error);
    }
    await commentModel.findByIdAndDelete(commentId);
    await userModel.findByIdAndUpdate(
      id,
      {
        $pull: { comments: comment.id },
      },
      { new: true, runValidators: true }
    );
    await postModel.findByIdAndUpdate(
      comment.post,
      {
        $pull: { comments: comment.id },
      },
      { new: true, runValidators: true }
    );
    res.status(200).json({ message: "comment deleted successfully" });
  } catch (error) {
    next(error);
  }
};
exports.updateComment = async (req, res, next) => {
  const { commentId } = req.params;
  const { text } = req.body;
  const { admin, id } = req.user;
  try {
    const comment = await commentModel.findById(commentId);
    if (!comment) {
      const error = new Error("Comment not found");
      error.status = 404;
      return next(error);
    }
    if (!admin && comment.commentedBy.toString() !== id) {
      const error = new Error("you cant delete this comment");
      error.status = 401;
      return next(error);
    }
    await commentModel.findByIdAndUpdate(
      commentId,
      { text },
      { new: true, runValidators: true }
    );
    return res.status(200).json({ messgae: "post updated succesfully" });
  } catch (error) {
    next(error);
  }
};
