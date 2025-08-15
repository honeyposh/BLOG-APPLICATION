const express = require("express");
const {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  login,
  getOneUser,
} = require("../controllers/userController");
const authentication = require("../middlewares/authMiddleware");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
// const moreFields = upload.fields([
//   { name: "displayPix", maxCount: 2 },
//   { name: "cv", maxCount: 2 },
//   { name: "video", maxCount: 1 },
// ]);
router.post("/createuser", createUser);
router.post("/login", login);
router.get("/getuser", authentication, getOneUser);
router.get("/getusers", getUsers);
router.put("/updateuser/:id", updateUser);
router.delete("/deleteuser", authentication, deleteUser);
module.exports = router;
