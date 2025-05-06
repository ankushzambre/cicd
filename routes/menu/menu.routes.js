const express = require("express");
const menuRoutes = express.Router();
const authorize = require("../../utils/authorize");
const { upload, multerErrorHandler } = require("../../utils/upload");

const {
  addMenu,
  getAllMenus,
  getSingleMenu,
  updateMenu,
  deleteMenu,
} = require("./menu.controller");

menuRoutes.post("/", authorize("create-menu"), upload.single("menuImage"), multerErrorHandler, addMenu);
menuRoutes.get("/", authorize("readAll-menu"), getAllMenus);
menuRoutes.get("/:id", authorize("readSingle-menu"), getSingleMenu);
menuRoutes.put("/:id", authorize("update-menu"),  upload.single("menuImage"), multerErrorHandler,  updateMenu); 
menuRoutes.patch("/:id", authorize("delete-menu"),  deleteMenu);

module.exports = menuRoutes;