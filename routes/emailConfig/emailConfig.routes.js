const express = require("express");
const {
  createEmailConfig,
  getEmailConfig,
  getSingleEmailConfig,
  updateEmailConfig,
  deleteEmailConfig,
} = require("./emailConfig.controller");
const authorize = require("../../utils/authorize"); // authentication middleware

const emailConfigRoutes = express.Router();

emailConfigRoutes.post("/", authorize("create-emailConfig"), createEmailConfig);
emailConfigRoutes.get("/", authorize("readAll-emailConfig"), getEmailConfig);
emailConfigRoutes.get(
  "/:id",
  authorize("readSingle-emailConfig"),
  getSingleEmailConfig
);
emailConfigRoutes.put(
  "/:id",
  authorize("update-emailConfig"),
  updateEmailConfig
);
emailConfigRoutes.delete(
  "/:id",
  authorize("delete-emailConfig"),
  deleteEmailConfig
);

module.exports = emailConfigRoutes;
