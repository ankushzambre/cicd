const express = require("express");
const {
  sendEmail,
  getAllEmails,
  getSingleEmail,
  deleteEmail,
} = require("./email.controllers");
const authorize = require("../../utils/authorize"); // authentication middleware

const emailRoutes = express.Router();

emailRoutes.post("/", authorize("create-email"), sendEmail);
emailRoutes.get("/", authorize("readAll-email"), getAllEmails);
emailRoutes.get("/:id", authorize("readSingle-email"), getSingleEmail);
emailRoutes.delete("/:id", authorize("delete-email"), deleteEmail);
module.exports = emailRoutes;
