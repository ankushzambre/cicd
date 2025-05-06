const express = require("express");
const holidayRoutes = express.Router();
const authorize = require("../../../utils/authorize");
const {
  addHoliday,
  getAllHolidays,
  getSingleHoliday,
  updateHoliday,
  deleteHoliday,
} = require("./holiday.controller");

holidayRoutes.post("/", addHoliday);
holidayRoutes.get("/", getAllHolidays);
holidayRoutes.get("/:id", getSingleHoliday);
holidayRoutes.put("/:id",  updateHoliday); // needs to add autherization 
holidayRoutes.delete("/:id",  deleteHoliday);// needs to add autherization

module.exports = holidayRoutes;