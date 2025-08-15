const userModel = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const postModel = require("../models/postModel");
exports.createUser = async (req, res, next) => {
  const { email, password, ...others } = req.body;
  if (!email || !password) {
    // throw new Error("please provide email and password");
    const error = new Error("Email and password required");
    error.status = 400;
    return next(error);
  }
  const userExist = await userModel.findOne({ email });
  if (userExist) {
    const error = new Error("User alrealdy exist");
    error.status = 400;
    return next(error);
  }
  try {
    const user = await userModel.create({
      email,
      password,
      ...others,
    });
    return res.status(201).json({ sucess: true, user });
  } catch (error) {
    return next(error);
  }
};
exports.getOneUser = async (req, res, next) => {
  const { id } = req.user;
  try {
    const user = await userModel
      .findById(id)
      .select("-password")
      .populate("posts")
      .populate("comments", "text");
    return res.status(200).json({ sucess: true, user });
  } catch (error) {
    return next(error);
  }
};
exports.getUsers = async (req, res, next) => {
  try {
    const user = await userModel.find();
    if (user.length === 0) {
      error = new Error("No User");
      error.status = 404;
      next(error);
    }
    return res.status(200).json({ sucess: true, user });
  } catch (error) {
    next(error);
  }
};
exports.updateUser = async (req, res, next) => {
  try {
    const body = req.body;
    const { id } = req.params;
    const user = await userModel.findById(id);
    if (req.body.password) {
      const error = new Error("you cannot update password");
      error.status = 400;
      return next(error);
    }
    if (!user) {
      const error = new Error("User Not found");
      error.status = 404;
      return next(error);
    }
    const updatedUser = await userModel.findByIdAndUpdate(
      id,
      { ...body },
      { new: true }
    );
    return res.status(200).json({ sucess: true, updatedUser });
  } catch (error) {
    return next(error);
  }
};
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.user;
    const user = await userModel.findById(id);
    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      return next(error);
    }
    await userModel.findByIdAndDelete(id);
    await postModel.deleteMany({ creator: req.user.id });
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};
exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      const error = new Error("Email not found please Sign up");
      error.status = 404;
      return next(error);
    }
    comparePassword = bcrypt.compareSync(password, user.password);
    if (!comparePassword) {
      const error = new Error("Please provide a valid password");
      error.status = 401;
      return next(error);
    }
    const token = jwt.sign(
      { id: user.id, admin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "1hr" }
    );
    res.cookie("token", token, {
      maxAge: 1000 * 60 * 60,
      secure: true,
      httpOnly: true,
    });
    return res.status(200).json({ success: true, token });
  } catch (error) {
    return next(error);
  }
};
