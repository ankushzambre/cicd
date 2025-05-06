const express = require("express");
const waitingListRoutes = express.Router();
const authorize = require("../../../utils/authorize");
const {
  addWaitingList,
  getAllWaitingList,
  deleteWaitingList,
} = require("./waitingList.controller");

waitingListRoutes.post("/", addWaitingList);
waitingListRoutes.get("/", authorize("readAll-waitingList"), getAllWaitingList);
waitingListRoutes.delete("/:id", authorize("delete-waitingList"),  deleteWaitingList);

module.exports = waitingListRoutes;