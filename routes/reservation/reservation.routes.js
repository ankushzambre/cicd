const authorize = require("../../utils/authorize");
const express = require("express");
const {
  getAvailableTables,
  addReservation,
  getAllReservation,
  getSingleReservation,
  updateSingleReservation,
  deleteSingleReservation, 
} = require("./reservation.controller.js");
const reservationRoutes = express.Router();

reservationRoutes.post("/table",  getAvailableTables,); // get available Table
reservationRoutes.post("/",  addReservation); // create Reservation
reservationRoutes.get("/",authorize("readAll-reservations"), getAllReservation); // get single Reservation
reservationRoutes.get("/:id",authorize("readSingle-reservations"),  getSingleReservation); // get single Reservation
reservationRoutes.put("/:id",authorize("update-reservations"),  updateSingleReservation); // update Reservation
reservationRoutes.patch("/:id", authorize("delete-reservations"), deleteSingleReservation); // delete Reservation

module.exports = reservationRoutes;
