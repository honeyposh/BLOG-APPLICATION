const express = require("express");
const {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  login,
  getOneUser,
  forgetPassword,
  resetPassword,
} = require("../controllers/userController");
const authentication = require("../middlewares/authMiddleware");
const router = express.Router();
const multer = require("multer");
router.post("/createuser", createUser);
router.post("/login", login);
router.get("/getuser", authentication, getOneUser);
router.get("/getusers", getUsers);
router.put("/updateuser/:id", updateUser);
router.delete("/deleteuser", authentication, deleteUser);
router.put("/forgetpassword", forgetPassword);
router.put("/resetpassword/:token", resetPassword);
module.exports = router;
