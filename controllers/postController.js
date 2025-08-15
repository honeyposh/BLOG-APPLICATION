const commentModel = require("../models/commentModel");
const postModel = require("../models/postModel");
const userModel = require("../models/userModel");
const cloudinary = require("../utils/cloudinary");
const fs = require("fs/promises");
const safeUnlink = async (filePath) => {
  if (filePath) {
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.error(`Failed to unlink ${filePath}:`, err.message);
    }
  }
};

exports.createPost = async (req, res, next) => {
  const body = req.body;
  const { id } = req.user;
  const file = req.files;
  let uploadedImages = [];
  const cleanupFiles = async () => {
    await safeUnlink(file?.["previewPix"]?.[0]?.path);
    await safeUnlink(file?.["detailPix"]?.[0]?.path);
  };

  try {
    const existingPost = await postModel.findOne({
      creator: id,
      title: body.title,
    });

    if (existingPost) {
      await cleanupFiles();
      const error = new Error("Post already exists");
      error.status = 400;
      return next(error);
    }
    const previewPixResponse = await cloudinary.uploader.upload(
      file["previewPix"][0].path,
      { folder: "axia" }
    );
    uploadedImages.push(previewPixResponse.public_id);

    const detailPixResponse = await cloudinary.uploader.upload(
      file["detailPix"][0].path,
      { folder: "axia" }
    );
    uploadedImages.push(detailPixResponse.public_id);
    const newPost = await postModel.create({
      creator: id,
      detailPix: detailPixResponse.secure_url,
      previewPix: previewPixResponse.secure_url,
      detailPixId: detailPixResponse.public_id,
      previewPixId: previewPixResponse.public_id,
      ...body,
    });
    await userModel.findByIdAndUpdate(
      id,
      { $push: { posts: newPost.id } },
      { new: true }
    );

    await cleanupFiles();

    return res.status(201).json({ newPost });
  } catch (error) {
    for (const publicId of uploadedImages) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        console.log(error);
      }
    }

    await cleanupFiles();

    return next(error);
  }
};

exports.getSinglePost = async (req, res, next) => {
  const { postId } = req.params;
  try {
    const post = await postModel
      .findById(postId)
      .populate("creator")
      .populate("comments", "text");
    if (!post) {
      const error = new Error("post not found");
      error.status = 404;
      return next(error);
    }
    return res.status(200).json(post);
  } catch (error) {
    return next(error);
  }
};
exports.getPosts = async (req, res, next) => {
  try {
    // const posts = await postModel.find({ creator: userId });
    const posts = await postModel.find();
    if (posts.length === 0) {
      const error = new Error("Post Not found");
      error.status = 404;
      return next(error);
    }
    return res.status(200).json({ post: posts });
  } catch (error) {
    return next(error);
  }
};
exports.deletePost = async (req, res, next) => {
  const { postId } = req.params;
  const { admin, id } = req.user;
  try {
    const post = await postModel.findById(postId);
    const comment = await commentModel.find({ post: postId });
    const commentIds = comment.map((c) => c.id);
    console.log(commentIds);
    if (!post) {
      const error = new Error("post not found");
      error.status = 404;
      return next(error);
    }
    if (id != post.creator && !admin) {
      const error = new Error("you cant delete this post");
      error.status = 401;
      return next(error);
    }
    await userModel.findByIdAndUpdate(
      id,
      { $pull: { posts: postId } },
      { new: true }
    );
    if (post.previewPixId) {
      await cloudinary.uploader.destroy(post.previewPixId);
    }
    if (post.detailPixId) {
      await cloudinary.uploader.destroy(post.detailPixId);
    }
    await userModel.updateMany(
      { comments: { $in: commentIds } },
      { $pull: { comments: { $in: commentIds } } }
    );
    await commentModel.deleteMany({ post: postId });
    await postModel.findByIdAndDelete(postId);
    return res.status(200).json({ message: "post deleted succesfully" });
  } catch (error) {
    next(error);
  }
};
exports.updatePost = async (req, res, next) => {
  const update = { ...req.body };
  const { postId } = req.params;
  const { id } = req.user;
  const cleanupFiles = async () => {
    await safeUnlink(req.files?.["previewPix"]?.[0]?.path);
    await safeUnlink(req.files?.["detailPix"]?.[0]?.path);
  };

  let newUploads = [];

  try {
    const post = await postModel.findById(postId);
    if (!post) {
      await cleanupFiles();
      const error = new Error("Post doesn’t exist");
      error.status = 404;
      return next(error);
    }
    if (post.creator.toString() !== id.toString()) {
      await cleanupFiles();
      const error = new Error("You cannot update this post");
      error.status = 401;
      return next(error);
    }
    const newPreviewPixFile = req.files?.["previewPix"]?.[0];
    const newDetailPixFile = req.files?.["detailPix"]?.[0];
    if (newDetailPixFile) {
      const detailPixResponse = await cloudinary.uploader.upload(
        newDetailPixFile.path,
        { folder: "Axia" }
      );
      newUploads.push(detailPixResponse.public_id);
      update.detailPix = detailPixResponse.secure_url;
      update.detailPixId = detailPixResponse.public_id;
      await fs.unlink(newDetailPixFile.path);
      if (post.detailPixId) {
        await cloudinary.uploader.destroy(post.detailPixId);
      }
    }
    if (newPreviewPixFile) {
      const previewPixResponse = await cloudinary.uploader.upload(
        newPreviewPixFile.path,
        { folder: "Axia" }
      );
      newUploads.push(previewPixResponse.public_id);
      update.previewPix = previewPixResponse.secure_url;
      update.previewPixId = previewPixResponse.public_id;
      await fs.unlink(newPreviewPixFile.path);
      if (post.previewPixId) {
        await cloudinary.uploader.destroy(post.previewPixId);
      }
    }
    const updatedPost = await postModel.findByIdAndUpdate(postId, update, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json(updatedPost);
  } catch (error) {
    for (const publicId of newUploads) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        console.log(error);
      }
    }
    await cleanupFiles();

    return next(error);
  }
};
