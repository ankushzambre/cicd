const prisma = require("../../../utils/prisma");

//create createVouchers
const createVouchers = async (req, res) => {
  try {
    if(!req.body.amount || req.body.amount <= 0){
      return res.status(400).json({ message: "Voucher amount is required and it should be greater than zero" });
    }
    if(!req.body.voucherCode){
      return res.status(400).json({ message: "Voucher code is required" });
    }
    // Get current date (without time for comparison)
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    // Validate dates
    const startDate = new Date(req.body.startDate);
    const endDate = new Date(req.body.endDate);
    if (startDate < currentDate) {
      return res.status(400).json({ message: "Start date cannot be in the past" });
    }

    if (endDate < currentDate) {
      return res.status(400).json({ message: "End date cannot be in the past" });
    }

    // Optional: Ensure end date is after start date
    if (endDate < startDate) {
      return res.status(400).json({ message: "End date must be after start date" });
    }

    const voucherAlreadyExist = await prisma.vouchers.findMany({
      where: {
        voucherCode: req.body.voucherCode,
      }
    });
    if(voucherAlreadyExist.length == 0){
      const createVouchers = await prisma.vouchers.create({
        data: {
          voucherCode: req.body.voucherCode,
          description: req.body.description,
          amount: req.body.amount,
          startDate: startDate,
          endDate: endDate,
          availability: req.body.availability,
          branchId: req.auth.branchId,
        },
      });
      return res.status(201).send(createVouchers);
    }else{
      return res.status(400).send({message:"Voucher already exists. Please try another voucher code." });
    }      
  } catch (error) {
    return res.status(400).send({ message: error.message });
}
};


//create create Gift Card
const createGiftCard = async (req, res) => {
  try {
    const giftCardAlreadyExist = await prisma.vouchers.findMany({
      where: {
        voucherCode: req.body.voucherCode,
      }
    });

    if(giftCardAlreadyExist.length == 0){
      const createGiftCard = await prisma.vouchers.create({
        data: {
          voucherCode: req.body.voucherCode,
          amount: req.body.amount,
          start_date: new Date(req.body.start_date),
          end_date: new Date(req.body.end_date),
          availability: req.body.availability,
          branchId: req.body.branchId,
          isGiftCard: req.body.isGiftCard,
          isGiftCardUsed: req.body.isGiftCardUsed,
        },
      });
      return res.status(201).send(createGiftCard);
    }else{
      return res.status(400).send({message:"Gift card code is already exist. Please try another code."});
    }      
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
}

//get all voucherList
const getAllVouchers = async (req, res) => {
  if (req.query.query === "all") {
    try {
      const vouchersList = await prisma.vouchers.findMany({
        where: {
          isDeleted: false,
          branchId: req.auth.branchId,
        },
        orderBy: {
          id: "asc",
        }
      });
      return res.status(200).json(vouchersList);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  } else if (req.query.query === "search") {
    try {
      const getAllVouchers = await prisma.vouchers.findMany({
        where: {
          isDeleted: false,
          branchId: req.auth.branchId,
        },
        orderBy: {
          id: "asc",
        },
        where: {
          OR: [
            {
              voucherCode: {
                contains: req.query.key,
              },
            },
          ],
        }
      });

      const response = {
        getAllVouchers: getAllVouchers,
        totalVoucherCount: {
          _count: {
            id: getAllVouchers.length,
          },
        },
      };
      return res.status(200).json(response);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  } else {
    try {
      const getAllVouchers = await prisma.vouchers.findMany({
        where: {
          isDeleted: false,
          branchId: req.auth.branchId,
        },
        orderBy: {
          id: "asc",
        }
      });
      return res.status(200).json(getAllVouchers);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
};

//get single voucher
const getSingleVoucher = async (req, res) => {
  try {
    const getSingleVoucherDetails = await prisma.vouchers.findUnique({
      where: {
        id: parseInt(req.params.id),
      }
    });
    if (getSingleVoucherDetails){
      return res.status(200).json(getSingleVoucherDetails);
    }
    return res.status(400).json({message:"Voucher not found."});
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

//update voucher details
const updateVoucher = async (req, res) => {
  try {
   if(!req.body.amount || req.body.amount <= 0){
    return res.status(400).json({ message: "Voucher amount is required and it should be greater than zero" });
  }
  if(!req.body.voucherCode){
    return res.status(400).json({ message: "Voucher code is required" });
  }
    // Get current date (without time for comparison)
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Validate start_date and end_date if provided
    const startDate = req.body.start_date ? new Date(req.body.start_date) : null;
    const endDate = req.body.end_date ? new Date(req.body.end_date) : null;

    if (startDate && startDate < currentDate) {
      return res.status(400).json({ message: "Start date cannot be in the past" });
    }

    if (endDate && endDate < currentDate) {
      return res.status(400).json({ message: "End date cannot be in the past" });
    }

    if (startDate && endDate && endDate < startDate) {
      return res.status(400).json({ message: "End date must be after start date" });
    }

    const voucherAlreadyExist = await prisma.vouchers.findMany({
      where: {
        voucherCode: req.body.voucherCode,
        isDeleted: false,
        branchId: req.auth.branchId,
        NOT: {
          id: parseInt(req.params.id)
        }
      }
    });

    if(voucherAlreadyExist.length == 0){
       const updateVoucher = await prisma.vouchers.update({
        where: {
          id: parseInt(req.params.id),
        },
        data: {
          voucherCode: req.body.voucherCode,
          description: req.body.description,
          amount: req.body.amount,
          start_date: startDate,
          end_date: endDate,
          availability: req.body.availability
        },
      });
      return res.status(200).json(updateVoucher);
    }else{
      return res.status(400).send({message: "Voucher already exists. Please try another voucher code."});
    }
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

//delete Voucher
const deleteVoucher = async (req, res) => {
  try {
    const id = Number(req.params.id);

    // Check if the voucher code exists
    const existingVoucher = await prisma.vouchers.findUnique({
      where: { 
        id: id,
        isDeleted: false,
        branchId: req.auth.branchId
      },
    });

    if (!existingVoucher) {
      return res.status(400).json({ message: "Voucher not found" });
    }

    // Delete the voucher if it exists
    await prisma.vouchers.update({
      where: { id: id },
      data:{
        isDeleted: true
      }
    });

    return res.status(200).json({ message: "Voucher deleted successfully" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

//Validate Voucher 
const validateVoucher = async (req, res) => {
  try {
    const voucherFound = await prisma.vouchers.findFirst({
      where: {
        voucherCode: req.body.voucherCode,
        isDeleted: false
        // branchId: req.auth.branchId,
      }
    });

    if(voucherFound){
      var from = new Date(voucherFound.start_date);  // -1 because months are from 0 to 11
      var to   = new Date(voucherFound.end_date);
      var check = new Date(req.body.bookingDate);
      if(check > from && check < to){
        if(voucherFound.isGiftCard && voucherFound.isGiftCardUsed){
          return res.status(400).send({ message: "Gift card already used."});
        }
        return res.status(200).send({ message: "Voucher valid.", id: voucherFound.id, amount: voucherFound.amount, isGiftCard: voucherFound.isGiftCard});
      }
    }
    return res.status(400).send({ message: "Voucher is invalid."});
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
};
module.exports = {
  createVouchers,
  getAllVouchers,
  getSingleVoucher,
  updateVoucher,
  deleteVoucher,
  validateVoucher,
  createGiftCard
};