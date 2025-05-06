const prisma = require("../../../utils/prisma");

/**
 * Add a new holiday to the database
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
const addHoliday = async (req, res) => {
  try {
    const data = req.body;
    if (!data.branchId || !data.startDate || !data.endDate) {
      return res.status(400).send({
        message:
          "Branch id or startDate or endDate is missing. Please check the request body.",
      });
    }

    const inputStartDate = new Date(data.startDate);
    const inputEndDate = new Date(data.endDate);

    // Disallow holidays for today or past dates
    const now = new Date();
    if (inputStartDate <= now) {
      return res.status(400).send({
        message: "Holiday for today or the past dates can not be added. Please check the dates.",
      });
    }

    // Check if any reservation already exists in the date range for the same branch
    const conflictingReservations = await prisma.reservations.findMany({
      where: {
        branchId: parseInt(data.branchId),
        reservationDate: {
          gte: inputStartDate,
          lte: inputEndDate,
        },
        isDeleted: false, // optionally ignore deleted reservations
      },
    });

    if (conflictingReservations.length > 0) {
      return res.status(400).send({
        message: "Cannot add holiday. Reservations exist during the selected date range.",
        reservations: conflictingReservations,
      });
    }

    // Check if the holiday already exists for the same date
    const holidayFound = await prisma.holiday.findMany({
      where: {
        startDate: {
          lte: inputStartDate,
        },
        endDate: {
          gte: inputStartDate,
        },
        branchId: parseInt(data.branchId),
      },
    });

    if (holidayFound.length > 0) {
      return res.status(400).send({
        message: "Holiday already exists for the same date.",
        holidayFound,
      });
    }
   else {
      // Create a new holiday
      const createHolidayResult = await prisma.holiday.create({
        data: {
          branchId: data.branchId,
          startDate: inputStartDate,
          endDate: inputEndDate,
          note: data.note,
        },
      });

      return res.status(201).send({
        message: "Holiday added successfully",
        createHolidayResult,
      });

    }
  
  } catch (error) {
   return res.status(400).json({
     message: "Unable to add holiday",
     error: error.message
   });
  }
};

// Get all branchs holiday list and branch wise holiday list
/**
 * Get all holidays for all branches or by branch id
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
const getAllHolidays = async (req, res) => {
  // Get current date
  const today = new Date();

  // Get holidays for all branches
  if (req.query.query === "all") {
    try {
      // Get holidays starting from today onwards
      const holidayList = await  prisma.holiday.findMany({
        orderBy: {
          startDate: "asc", // Sorting by startDate in ascending order
        },
        where: {
          endDate: {
            gte: today,
          },
        },
        include: {
          user: {
            select: {
              id: true,
            },
          },
        },
      });

      // Response
      const response = {
        holidayList: holidayList,
        totalHolidayListCount: holidayList.length,
      };
      return res.status(200).json(response);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
  // Get holidays by branch id
  else if (req.query.branchId) {
    try {
      const holidayList = await  prisma.holiday.findMany({
        orderBy: {
          startDate: "asc", // Sorting by startDate in ascending order
        },
        where: {
          branchId: parseInt(req.query.branchId),
          endDate: {
            gte: today, // Get holidays starting from today onwards
          },
        },
        include: {
          user: {
            select: {
              id: true,
            },
          },
        },
      });

      // Response
      const response = {
        holidayList: holidayList,
        totalHolidayListCount: holidayList.length,
      };
      return res.status(200).json(response);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  } else {
    // If branch id is not provided
    return res.status(400).json({ message: "Please send the branch id. Get holiday list" });
  }
};

// Get single holiday record details
/**
 * Get single holiday record details
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
const getSingleHoliday = async (req, res) => {
  try {
    // Get the holiday record with the given id
    const getSingleHolidayRecord = await  prisma.holiday.findUnique({
      where: {
        id: parseInt(req.params.id),
      },
      // Include the user who created the holiday
      include: {  
        user:{
          select:{
            id: true,
          }
        }
      },
    });
    if (getSingleHolidayRecord){
      // Return the holiday record
      return res.status(200).json(getSingleHolidayRecord);
    }
    // If the holiday record is not found
    return res.status(400).json({message:"Holiday details not found."});
  } catch (error) {
    // Return an error
    return res.status(400).json({ error: error.message });
  }
};

// Update holiday details
/**
 * Update holiday details
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
const updateHoliday = async (req, res) => {
  try {
    const holidayAlreadyExist = await prisma.holiday.findMany({
      where: {
        id: parseInt(req.params.id),
        branchId: req.body.branchId
      }
    });

    if(holidayAlreadyExist.length == 0){
      return res.status(400).send({message: "Holiday record not found"});
    }else{
      const inputStartDate = new Date(req.body.startDate)
      const inputEndDate = new Date(req.body.endDate)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      inputStartDate.setHours(0, 0, 0, 0);

      // Check if the start date is in the past or today
      if (inputStartDate <= today) {
        return res.status(400).send({ message: "Holiday cannot be set for today or past days." });
      }

      // Check if the start date is already taken by another holiday
      let holidayFound = await prisma.holiday.findMany({
        where: {
          startDate: {
            lte: inputStartDate,
          },
          endDate: {
            gte: inputStartDate,
          },
          branchId: parseInt(req.body.branchId),
          NOT: {
            id: parseInt(req.params.id)
          }
        },
      });
      if(holidayFound.length>0){
        return res.status(400).send({message:"Holiday is already exist for the same date.",holidayFound});
      }else{
        const createHolidayResult = await  prisma.holiday.update({
          where: {
            id: parseInt(req.params.id),
          },
          data: {
            "branchId": req.body.branchId,
            "startDate": inputStartDate,
            "endDate": inputEndDate,
            "note": req.body.note
          }
        });
        return res.status(201).send({message: "Holiday updated successfully", createHolidayResult});
      }
    }
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

/**
 * Delete a holiday
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
const deleteHoliday = async (req, res) => {
  try {
    const id = Number(req.params.id);

    // Check if the holiday exists
    const existingHoliday = await prisma.holiday.findUnique({
      // Find the holiday by its ID
      where: { id: id },
    });

    if (!existingHoliday) {
      // If the holiday is not found, return an error
      return res.status(400).json({ message: "Holiday not found" });
    }

    // Delete the holiday if it exists
    await prisma.holiday.delete({
      // Delete the holiday by its ID
      where: { id: id },
    });

    // Return a success message if the holiday is deleted
    return res.status(200).json({ message: "Holiday deleted successfully" });
  } catch (error) {
    // Catch any errors and return a 400 status
    return res.status(400).json({ error: error.message });
  }
};


module.exports = {
  addHoliday,
  getAllHolidays,
  getSingleHoliday,
  updateHoliday,
  deleteHoliday
};