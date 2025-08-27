const commentModel = require("../models/commentModel");
const postModel = require("../models/postModel");
const userModel = require("../models/userModel");
const cloudinary = require("../utils/cloudinary");
const fs = require("fs/promises");

exports.createPost = async (req, res, next) => {
  const body = req.body;
  const { id } = req.user;
  const files = req.files;
  let uploadedImages = [];
  let filePath = [];
  if (files.previewPix) {
    filePath.push(files.previewPix[0].path);
  }
  if (files.detailPix) {
    filePath.push(files.detailPix[0].path);
  }

  const cleanup = async () => {
    for (let path of filePath) {
      try {
        await fs.unlink(path);
      } catch (error) {
        console.log(error);
      }
    }
    for (const img of uploadedImages) {
      try {
        await cloudinary.uploader.destroy(img.public_id);
      } catch (error) {
        console.log(error);
      }
    }
  };

  try {
    const existingPost = await postModel.findOne({
      creator: id,
      title: body.title,
    });

    if (existingPost) {
      await cleanup();
      const error = new Error("Post already exists");
      error.status = 400;
      return next(error);
    }
    if (!files.previewPix || files.previewPix.length === 0) {
      await cleanup();
      const error = new Error("Preview image is required");
      error.status = 400;
      return next(error);
    }
    const previewPixResponse = await cloudinary.uploader.upload(
      files["previewPix"][0].path,
      { folder: "axia" }
    );
    uploadedImages.push(previewPixResponse);
    let detailPixResponse = null;
    await fs.unlink(files.previewPix[0].path);
    if (files.detailPix && files.detailPix.length > 0) {
      detailPixResponse = await cloudinary.uploader.upload(
        files["detailPix"][0].path,
        { folder: "axia" }
      );
      uploadedImages.push(detailPixResponse);
      await fs.unlink(files.detailPix[0].path);
    }
    const newPost = await postModel.create({
      creator: id,
      detailPix: detailPixResponse
        ? {
            url: detailPixResponse.secure_url,
            public_id: detailPixResponse.public_id,
          }
        : null,
      previewPix: {
        url: previewPixResponse.secure_url,
        public_id: previewPixResponse.public_id,
      },
      ...body,
    });
    await userModel.findByIdAndUpdate(
      id,
      { $push: { posts: newPost.id } },
      { new: true }
    );
    return res.status(201).json({ newPost });
  } catch (error) {
    await cleanup();
    return next(error);
  }
};

exports.getSinglePost = async (req, res, next) => {
  const { postId } = req.params;
  try {
    const post = await postModel
      .findById(postId)
      .populate("creator", "name")
      .populate({
        path: "comments",
        select: "text",
        options: { sort: { createdAt: -1 }, limit: 3 },
        populate: { path: "commentedBy", select: "name" },
      });

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
  const { title, keyword, sort } = req.query;
  const queryObject = {};
  try {
    if (keyword) {
      queryObject.title = { $regex: keyword, $options: "i" };
    }
    if (title) {
      queryObject.title = { $regex: title, $options: "i" };
    }

    let result = postModel
      .find(queryObject)
      .populate("creator", "name")
      .populate({
        path: "comments",
        select: "text",
        options: { sort: { createdAt: -1 }, limit: 3 },
        populate: { path: "commentedBy", select: "name" },
      });
    if (sort) {
      result = result.sort(sort);
    } else {
      result = result.sort("-createdAt");
    }
    const limit = Number(req.query.limit) || 10;
    const page = Number(req.query.page) || 1;
    const skip = (page - 1) * limit;
    result = result.skip(skip).limit(limit);
    const posts = await result;
    const total = await postModel.countDocuments(queryObject);
    if (posts.length === 0) {
      const error = new Error("Post Not found");
      error.status = 404;
      return next(error);
    }
    return res.status(200).json({ posts, total });
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
      post.creator,
      { $pull: { posts: postId } },
      { new: true }
    );
    console.log(post.previewPix.public_id);
    console.log(post.detailPix.public_id);
    if (post.detailPix?.public_id) {
      await cloudinary.uploader.destroy(post.detailPix.public_id);
    }
    // note
    if (post.previewPix?.public_id) {
      await cloudinary.uploader.destroy(post.previewPix.public_id);
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
  const { title, description } = req.body;
  const { postId } = req.params;
  const { id } = req.user;
  const files = req.files;
  let uploadedImages = [];
  let filePath = [];
  if (files.previewPix) {
    filePath.push(files.previewPix[0].path);
  }
  if (files.detailPix) {
    filePath.push(files.detailPix[0].path);
  }

  const cleanup = async () => {
    for (let path of filePath) {
      try {
        await fs.unlink(path);
      } catch (error) {
        console.log(error);
      }
    }
    for (const img of uploadedImages) {
      try {
        await cloudinary.uploader.destroy(img.public_id);
      } catch (error) {
        console.log(error);
      }
    }
  };
  try {
    const post = await postModel.findById(postId);
    if (!post) {
      await cleanup();
      const error = new Error("Post doesn’t exist");
      error.status = 404;
      return next(error);
    }
    if (post.creator.toString() !== id.toString()) {
      await cleanup();
      const error = new Error("You cannot update this post");
      error.status = 401;
      return next(error);
    }

    let updateFields = { title, description };
    if (files.detailPix && files.detailPix[0]) {
      const newDetailPix = files.detailPix[0];
      const detailPixResponse = await cloudinary.uploader.upload(
        newDetailPix.path,
        { folder: "Axia" }
      );
      uploadedImages.push(detailPixResponse);
      await fs.unlink(newDetailPix.path);

      if (post.detailPix?.public_id) {
        await cloudinary.uploader.destroy(post.detailPix.public_id);
      }

      updateFields.detailPix = {
        url: detailPixResponse.secure_url,
        public_id: detailPixResponse.public_id,
      };
    }
    if (files.previewPix && files.previewPix[0]) {
      const newPreviewPix = files.previewPix[0];
      const previewPixResponse = await cloudinary.uploader.upload(
        newPreviewPix.path,
        { folder: "Axia" }
      );
      uploadedImages.push(previewPixResponse);
      await fs.unlink(newPreviewPix.path);

      if (post.previewPix?.public_id) {
        await cloudinary.uploader.destroy(post.previewPix.public_id);
      }

      updateFields.previewPix = {
        url: previewPixResponse.secure_url,
        public_id: previewPixResponse.public_id,
      };
    }
    const updatedPost = await postModel.findByIdAndUpdate(
      postId,
      updateFields,
      {
        new: true,
        runValidators: true,
      }
    );
    return res.status(200).json(updatedPost);
  } catch (error) {
    await cleanup();
    return next(error);
  }
};
