const express = require("express");
const authorize = require("../../utils/authorize");
const dailymenuRoutes = express.Router();

const {
  addDailyMenu,
  getAllDailyMenus,
  getSingleDailyMenu,
  updateDailyMenu,
  deleteDailyMenu,
} = require("./dailyMenu.controller");

dailymenuRoutes.post("/", authorize("create-dailyMenu"),  addDailyMenu);
dailymenuRoutes.get("/", authorize("readAll-dailyMenu"), getAllDailyMenus);
dailymenuRoutes.get("/:id", authorize("readSingle-dailyMenu"), getSingleDailyMenu);
dailymenuRoutes.put("/:id", authorize("update-dailyMenu"),  updateDailyMenu); 
dailymenuRoutes.patch("/:id", authorize("delete-dailyMenu"),  deleteDailyMenu);

module.exports = dailymenuRoutes;