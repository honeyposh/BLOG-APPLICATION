const jwt = require("jsonwebtoken");
const authentication = async (req, res, next) => {
  const { token } = req.cookies;
  // to check if token exist or user is logged in
  if (!token) {
    return res.json({ message: "please Login" });
  }
  // check if token is not valid
  jwt.verify(token, process.env.JWT_SECRET, (error, payload) => {
    if (error) {
      return res.json({ message: error.message });
    }
    req.user = { id: payload.id, admin: payload.admin };
  });
  next();
};
module.exports = authentication;
