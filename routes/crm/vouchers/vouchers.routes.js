const express = require("express");
const vouchersRoutes = express.Router();
const authorize = require("../../../utils/authorize");
const {
  createVouchers,
  getAllVouchers,
  getSingleVoucher,
  updateVoucher,
  deleteVoucher,
  validateVoucher,
  createGiftCard
} = require("./vouchers.controller");

vouchersRoutes.post("/", authorize("create-vourchers"), createVouchers);
vouchersRoutes.post("/gift-card", createGiftCard);
vouchersRoutes.get("/", authorize("readAll-vourchers"), getAllVouchers);// needs to add autherization
vouchersRoutes.get("/:id", getSingleVoucher);// needs to add autherization
vouchersRoutes.put("/:id", authorize("update-vourchers"), updateVoucher); // needs to add autherization 
vouchersRoutes.delete("/:id", authorize("delete-vourchers"), deleteVoucher);// needs to add autherization
vouchersRoutes.post("/validate", validateVoucher);

module.exports = vouchersRoutes;