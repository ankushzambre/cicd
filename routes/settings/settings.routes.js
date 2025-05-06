const express = require("express");
const {
    addSetting,
     updateSetting, getSetting, 
     deleteSetting
     } = require("./settings.controllers");
const authorize = require("../../utils/authorize");

const settingRoutes = express.Router();

settingRoutes.post("/", authorize("create-settings"),  addSetting);
settingRoutes.put("/", authorize("update-settings"), updateSetting);
settingRoutes.get("/", authorize("readAll-settings"), getSetting);
settingRoutes.patch("/:id", authorize("delete-settings"), deleteSetting);

module.exports = settingRoutes;
