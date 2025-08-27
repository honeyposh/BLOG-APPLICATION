const userModel = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const postModel = require("../models/postModel");
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w]).{8,}$/;
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key: process.env.TRANSPORTER_API_KEY,
    },
  })
);
exports.createUser = async (req, res, next) => {
  const { email, password, ...others } = req.body;
  if (!email || !password) {
    // throw new Error("please provide email and password");
    const error = new Error("Email and password required");
    error.status = 400;
    return next(error);
  }
  if (!passwordRegex.test(password)) {
    const error = new Error(
      "Password must be at least 8 characters and contain at least 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character"
    );
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
exports.forgetPassword = async (req, res, next) => {
  const { email } = req.body;
  const user = await userModel.findOne({ email });
  if (!user) {
    const error = new Error("Email not found please signup");
    error.status = 404;
    return next(error);
  }
  const token = jwt.sign({ id: user.id }, process.env.forgetpassword_secret, {
    expiresIn: "2m",
  });
  try {
    await transporter.sendMail({
      from: "horneyposh@gmail.com",
      to: email,
      subject: "Password reset",
      html: `
    <h1> Please click on the given link to reset your password</h1>
    <p>${process.env.CLIENT_URL}/resetpassword/${token}</p>
    `,
    });
    user.resetPasswordLink = token;
    await user.save();
    return res.status(200).json({ message: "Link sent to your email" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "We couldn't send the reset email. Please try again later.",
    });
  }
};
exports.resetPassword = async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const payload = jwt.verify(token, process.env.forgetpassword_secret);
    const user = await userModel.findOne({ resetPasswordLink: token });
    if (!user) {
      const error = new Error("user not found");
      error.status = 404;
      return next(error);
    }
    if (!password) {
      const error = new Error("Password is required");
      error.status = 400;
      return next(error);
    }
    if (!passwordRegex.test(password)) {
      const error = new Error(
        "Password must be at least 8 characters and contain at least 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character"
      );
      error.status = 400;
      return next(error);
    }
    const newPassword = bcrypt.hashSync(password, 10);
    user.password = newPassword;
    user.resetPasswordLink = "";
    await user.save();
    return res.status(200).json({ message: "Password successfully reset" });
  } catch (error) {
    next(error);
  }
};
