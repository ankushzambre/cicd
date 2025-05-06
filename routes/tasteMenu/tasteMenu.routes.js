const express = require("express");
const tasteMenuRoutes = express.Router();
const authorize = require("../../utils/authorize");
const { upload, multerErrorHandler } = require("../../utils/upload");

const {
    addtasteMenu,
    getAlltasteMenus,
    getSingletasteMenu,
    updatetasteMenu,
    deletetasteMenu,
} = require("./tasteMenu.controller");

tasteMenuRoutes.post("/", authorize("create-tasteMenu"), upload.single("image"), multerErrorHandler, addtasteMenu,);
tasteMenuRoutes.get("/",  getAlltasteMenus);
tasteMenuRoutes.get("/:id", authorize("readSingle-tasteMenu"), getSingletasteMenu);
tasteMenuRoutes.put("/:id", authorize("update-tasteMenu"), upload.single("image"), multerErrorHandler, updatetasteMenu);
tasteMenuRoutes.patch("/:id", authorize("delete-tasteMenu"), deletetasteMenu);

module.exports = tasteMenuRoutes;