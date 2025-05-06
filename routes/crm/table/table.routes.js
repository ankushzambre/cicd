const express = require("express");
const tableRoutes = express.Router();
const authorize = require("../../../utils/authorize");
const {
  addTable,
  getAllTables,
  getSingleTable,
  updateTable,
  deleteTable,
} = require("./table.controller");

tableRoutes.post("/", authorize("create-table"), addTable);
tableRoutes.get("/", authorize("readAll-table"), getAllTables);
tableRoutes.get("/:id", authorize("readSingle-table"), getSingleTable);
tableRoutes.put("/:id", authorize("update-table"),  updateTable); 
tableRoutes.patch("/:id", authorize("delete-table"),  deleteTable);

module.exports = tableRoutes;