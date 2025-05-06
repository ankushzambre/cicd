const authorize = require("../../utils/authorize");
const express = require("express");
const { upload, multerErrorHandler } = require("../../utils/upload");

const {
  login,
  register,
  getAllUser,
  getSingleUser,
  updateSingleUser,
  deleteSingleUser,
  resetPassword,
  forgotPassword

} = require("./user.controller.js");
const userRoutes = express.Router();

userRoutes.post("/login", login); // public route
userRoutes.post("/", authorize("create-user"), upload.single("profileImage"), multerErrorHandler, register); // create user
userRoutes.get("/",authorize("readAll-user"),  getAllUser); // get single user
userRoutes.get("/:id",authorize("readSingle-user"),  getSingleUser); // get single user
userRoutes.put("/:id", authorize("update-user"), upload.single("profileImage"), multerErrorHandler, updateSingleUser); // update user
userRoutes.patch("/forgot-password", forgotPassword);
userRoutes.patch("/:id", authorize("delete-user"), deleteSingleUser); // delete user
userRoutes.patch("/reset-password/:id", authorize("update-user"), resetPassword);

module.exports = userRoutes;
