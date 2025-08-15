require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const app = express();
const port = process.env.PORT || 8000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("successfully connected to mongodb");
  })
  .catch((error) => {
    console.log(error);
  });
const userRoute = require("./routes/userRoute");
const postRoute = require("./routes/postRoute");
const commentRoute = require("./routes/commentRoute");
app.use(express.json());
app.use(cookieParser());
app.use(
  express.text({
    type: [
      "text/plain",
      "application/javascript",
      "text/html",
      "application/xml",
    ],
  })
);
// for urlencoded
app.use(express.urlencoded());
app.use(userRoute);
app.use(postRoute);
app.use(commentRoute);
app.use((error, req, res, next) => {
  return res
    .status(error.status || 500)
    .json({ message: error.message || "server error" });
});
app.listen(port, () => {
  console.log(`Server Listen on port ${port}`);
});
