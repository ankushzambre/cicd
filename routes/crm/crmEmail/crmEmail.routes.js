const express = require("express");
const crmEmailRoutes = express.Router();
const {
  createCrmEmail,
  getAllCrmEmails,
  getSingleCrmEmail,
  deleteCrmEmail,
} = require("./crmEmail.controller");
const authorize = require("../../../utils/authorize");

crmEmailRoutes.post("/", authorize("create-email"), createCrmEmail);
crmEmailRoutes.get("/", authorize("readAll-email"), getAllCrmEmails);
crmEmailRoutes.get("/:id", authorize("readSingle-email"), getSingleCrmEmail);
crmEmailRoutes.delete("/:id", authorize("delete-email"), deleteCrmEmail);

module.exports = crmEmailRoutes;
