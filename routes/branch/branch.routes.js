const authorize = require("../../utils/authorize");
const express = require("express");
const {
  addBranch,
  getAllBranch,
  getSingleBranch,
  updateSingleBranch,
  deleteSingleBranch,
  getSingleBranchDetails,
} = require("./branch.controller.js");
const branchRoutes = express.Router();

branchRoutes.post("/", authorize("create-branch"),  addBranch); // create Branch
branchRoutes.get("/",authorize("readAll-branch"),  getAllBranch); // get single Branch
branchRoutes.get("/:id",authorize("readSingle-branch"),  getSingleBranch); // get single Branch
branchRoutes.get("/public/:id",  getSingleBranchDetails); // get single Branch public API
branchRoutes.put("/:id", authorize("update-branch"), updateSingleBranch); // update Branch
branchRoutes.patch("/:id", authorize("delete-branch"), deleteSingleBranch); // delete Branch

module.exports = branchRoutes;
