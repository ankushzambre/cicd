const prisma = require("../../utils/prisma");

//create branch
/**
 * @api {post} /branch Create a new branch
 * @apiName CreateBranch
 * @apiGroup Branch
 * @apiPermission admin
 *
 * @apiParam {string} paymentGatewayID Payment Gateway ID
 * @apiParam {string} cgstNumber CGST Number
 * @apiParam {string} sgstNumber SGST Number
 * @apiParam {string} weekDays Week days (comma-separated)
 * @apiParam {string} weekendDays Weekend days (comma-separated)
 * @apiParam {string} weekOffDay Week off day (comma-separated)
 * @apiParam {string} openingTime Opening time
 * @apiParam {string} closingTime Closing time
 * @apiParam {string} weekendOpeningTime Weekend opening time
 * @apiParam {string} weekendClosingTime Weekend closing time
 * @apiParam {number} maxGuestSize Maximum guest size
 * @apiParam {string} email Email
 *
 * @apiSuccess {object} branch Branch data
 * @apiSuccess {string} branch.paymentGatewayID Payment Gateway ID
 * @apiSuccess {string} branch.cgstNumber CGST Number
 * @apiSuccess {string} branch.sgstNumber SGST Number
 * @apiSuccess {string[]} branch.weekDays Week days
 * @apiSuccess {string[]} branch.weekendDays Weekend days
 * @apiSuccess {string[]} branch.weekOffDay Week off day
 * @apiSuccess {string} branch.openingTime Opening time
 * @apiSuccess {string} branch.closingTime Closing time
 * @apiSuccess {string} branch.weekendOpeningTime Weekend opening time
 * @apiSuccess {string} branch.weekendClosingTime Weekend closing time
 * @apiSuccess {number} branch.maxGuestSize Maximum guest size
 * @apiSuccess {string} branch.email Email
 *
 * @apiError {object} 400 Validation error
 * @apiError {object} 403 Unauthorized (only admins can create branchs)
 * @apiError {object} 500 Server error
 */
const addBranch = async (req, res) => {
  try {
    // Authorization Check (Only admins can create branchs)
    if (req.auth.userId !== req.auth.sub &&!req.auth.permissions.includes("create-branch")) {
      return res.status(403).json({ message: "Unauthorized. You are not an admin." });
    }

    // Validate required fields
    const { paymentGatewayID, cgstNumber,sgstNumber, weekDays,weekendDays,weekOffDay,openingTime,closingTime, weekendOpeningTime , weekendClosingTime, maxGuestSize, email  } = req.body;

    if (!paymentGatewayID || !cgstNumber || !sgstNumber || !weekDays || !weekendDays || !weekOffDay || !openingTime || !closingTime ||  !weekendOpeningTime || !weekendClosingTime || !maxGuestSize || !email) {
      return res.status(400).send({ message: "All fields are required." });
    }
     

    // Create new branch
    const newBranch = await prisma.branch.create({
      data: {
        paymentGatewayID,
        cgstNumber,
        sgstNumber,
        weekDays,
        weekendDays,
        weekOffDay,
        openingTime,
        closingTime,
        weekendOpeningTime,
        weekendClosingTime,
        email,
        maxGuestSize: parseInt(maxGuestSize),
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        createdBy: req.auth.userId, 
        updatedBy: req.auth.userId,
        deletedBy: null,
      },
      include: {
         createdAt: false,
        updatedAt: false,
        isDeleted: false,
        deletedAt: false,
        deletedBy: false,
        createdBy: false,
        updatedBy: false,
      },
    });

      // Convert stored comma-separated strings back to arrays for the response
    const formattedBranch = {
      ...newBranch,
      weekDays: newBranch.weekDays ? newBranch.weekDays.split(",") : [],
      weekendDays: newBranch.weekendDays ? newBranch.weekendDays.split(",") : [],
      weekOffDay: newBranch.weekOffDay ? newBranch.weekOffDay.split(",") : [],
    };

    return res.status(201).json(formattedBranch);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};


// Update a single branch
/**
 * @api {patch} /branch/:id Update a branch
 * @apiName UpdateBranch
 * @apiGroup Branch
 * @apiPermission admin
 *
 * @apiParam {number} id Branch ID
 * @apiParam {string} paymentGatewayID Payment Gateway ID
 * @apiParam {string} cgstNumber CGST Number
 * @apiParam {string} sgstNumber SGST Number
 * @apiParam {string} weekDays Week days (comma-separated)
 * @apiParam {string} weekendDays Weekend days (comma-separated)
 * @apiParam {string} weekOffDay Week off day (comma-separated)
 * @apiParam {string} openingTime Opening time
 * @apiParam {string} closingTime Closing time
 * @apiParam {string} weekendOpeningTime Weekend opening time
 * @apiParam {string} weekendClosingTime Weekend closing time
 * @apiParam {number} maxGuestSize Maximum guest size
 * @apiParam {string} email Email
 *
 * @apiSuccess {object} branch Branch data
 * @apiSuccess {string} branch.paymentGatewayID Payment Gateway ID
 * @apiSuccess {string} branch.cgstNumber CGST Number
 * @apiSuccess {string} branch.sgstNumber SGST Number
 * @apiSuccess {string[]} branch.weekDays Week days
 * @apiSuccess {string[]} branch.weekendDays Weekend days
 * @apiSuccess {string[]} branch.weekOffDay Week off day
 * @apiSuccess {string} branch.openingTime Opening time
 * @apiSuccess {string} branch.closingTime Closing time
 * @apiSuccess {string} branch.weekendOpeningTime Weekend opening time
 * @apiSuccess {string} branch.weekendClosingTime Weekend closing time
 * @apiSuccess {number} branch.maxGuestSize Maximum guest size
 * @apiSuccess {string} branch.email Email
 *
 * @apiError {object} 400 Validation error
 * @apiError {object} 403 Unauthorized (only admins can update branches)
 * @apiError {object} 500 Server error
 */
const updateSingleBranch = async (req, res) => {
  try {
    // Get the branch ID from the request URL parameters
    const branchId = parseInt(req.params.id);

    // Authorization Check
    if (
      // Only admins can update branches
      req.auth.userId !== req.auth.sub &&
      !req.auth.permissions.includes("update-branch")
    ) {
      return res.status(403).json({ message: "Unauthorized. You are not an admin." });
    }

    // Extract the branch data from the request body
    const updatedData = {
      paymentGatewayID: req.body.paymentGatewayID,
      cgstNumber: req.body.cgstNumber,
      sgstNumber: req.body.sgstNumber,
      weekDays: req.body.weekDays,
      weekendDays: req.body.weekendDays,
      weekOffDay: req.body.weekOffDay,
      openingTime: req.body.openingTime,
      closingTime: req.body.closingTime,
      weekendOpeningTime:  req.body.weekendOpeningTime,     
      weekendClosingTime: req.body.weekendClosingTime,
      email: req.body.email,
      // Convert maxGuestSize to an integer
      maxGuestSize: parseInt(req.body.maxGuestSize),
      // Update the updatedAt field
      updatedAt: new Date(),
      updatedBy: req.auth.userId,
    };

    // Update the branch
    const updateBranch = await prisma.branch.update({
      where: { id: branchId },
      data: updatedData,
      include: {
        createdAt: false,
        updatedAt: false,
        isDeleted: false,
        deletedAt: false,
        deletedBy: false,
        createdBy: false,
        updatedBy: false,
      },
    });

    // Convert stored comma-separated values into arrays for API response
    const formattedBranch = {
      ...updateBranch,
      weekDays: updateBranch.weekDays ? updateBranch.weekDays.split(",") : [],
      weekendDays: updateBranch.weekendDays ? updateBranch.weekendDays.split(",") : [],
      weekOffDay: updateBranch.weekOffDay ? updateBranch.weekOffDay.split(",") : [],
    };

    return res.status(200).json({
      message: "Branch updated successfully.",
      branch: formattedBranch,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};


//get all branch
/**
 * Get all branches from the database.
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {Object} req.query - The query object
 * @param {string} req.query.query - The query string
 * @param {string} req.query.status - The status string
 * @returns {Promise<void>}
 */
const getAllBranch = async (req, res) => {
  if (req.query.query === "all") {
    try {
      const allBranch = await prisma.branch.findMany({
        orderBy: {
          id: "asc",
        },
        include: {
           createdAt: false,
        updatedAt: false,
        isDeleted: false,
        deletedAt: false,
        deletedBy: false,
        createdBy: false,
        updatedBy: false,
        },
      });
      return res.status(200).json(
        allBranch
          .map((u) => {
            const { password, ...branchWithoutPassword } = u;
            return branchWithoutPassword;
          })
          .sort((a, b) => a.id - b.id)
      );
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  } else if (req.query.status === "true") {
    try {
      const allBranch = await prisma.branch.findMany({
        where: {
          NOT: {
            isDeleted: true,
          },
        },
        orderBy: {
          id: "asc",
        },
        include: {
           createdAt: false,
        updatedAt: false,
        isDeleted: false,
        deletedAt: false,
        deletedBy: false,
        createdBy: false,
        updatedBy: false,
        },

      });
      return res.status(200).json(
        allBranch
          .map((u) => {
            const { password, ...branchWithoutPassword } = u;
            return branchWithoutPassword;
          })
          .sort((a, b) => a.id - b.id)
      );
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  } else {
    try {
      const allBranch = await prisma.branch.findMany({
        orderBy: {
          id: "asc",
        },
        include: {
           createdAt: false,
        updatedAt: false,
        isDeleted: false,
        deletedAt: false,
        deletedBy: false,
        createdBy: false,
        updatedBy: false,

        },
      });

      /**
       * Format the returned branches by converting
       * stored comma-separated values into arrays.
       */
      const formattedBranches = allBranch.map((branch) => {
        const { password, ...branchWithoutPassword } = branch;

        return {
          ...branchWithoutPassword,
          weekDays: branch.weekDays ? branch.weekDays.split(",") : [],
          weekendDays: branch.weekendDays ? branch.weekendDays.split(",") : [],
          weekOffDay: branch.weekOffDay ? branch.weekOffDay.split(",") : [],
        };
      });
      return res.status(200).json(
        formattedBranches
          .map((u) => {
            const { password, ...branchWithoutPassword } = u;
            return branchWithoutPassword;
          })
          .sort((a, b) => a.id - b.id)
      );

    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
};


//get single branch
/**
 * Retrieves a single branch by ID. Only admin has permission
 * to call this endpoint.
 *
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {import("express").NextFunction} next - The next middleware function
 * @returns {Promise<void>}
 */


const getSingleBranch = async (req, res) => {
  try {
    // Get branch ID from request parameters
    const id = parseInt(req.params.id);

    // Check permissions
    if (!req.auth.permissions.includes("readSingle-branch")) {
      return res
        .status(401)
        .json({ message: "Unauthorized. You are not an admin" });
    }

    // Get single branch
    const singleBranch = await prisma.branch.findUnique({
      where: {
        id,
        isDeleted: false
      },
      include: {
        holiday: true,
        createdAt: false,
        updatedAt: false,
        isDeleted: false,
        deletedAt: false,
        deletedBy: false,
        createdBy: false,
        updatedBy: false,

      },
    });

    // Handle not found error
    if (!singleBranch) {
      return res.status(400).json({ message: "Branch not found." });
    }

    // Convert weekDays, weekendDays, and weekOffDay to arrays
    const formattedBranch = {
      ...singleBranch,
      weekDays: singleBranch.weekDays ? singleBranch.weekDays.split(",") : [],
      weekendDays: singleBranch.weekendDays ? singleBranch.weekendDays.split(",") : [],
      weekOffDay: singleBranch.weekOffDay ? singleBranch.weekOffDay.split(",") : [],
    };

    // Return the formatted branch
    return res.status(200).json(formattedBranch);
  } catch (error) {
    // Handle internal server errors
    return res.status(400).json({
      message: "An error occurred while fetching the branch",
      error: error.message
    });
  }
};


const getSingleBranchDetails = async (req, res) => {
  try {
    // Get branch ID from request parameters
    const id = parseInt(req.params.id);

    // Get single branch
    const singleBranch = await prisma.branch.findUnique({
      where: {
        id,
        isDeleted: false
      },
      include: {
        holiday: true,
        createdAt: false,
        updatedAt: false,
        isDeleted: false,
        deletedAt: false,
        deletedBy: false,
        createdBy: false,
        updatedBy: false,
        cgstNumber: false,
        sgstNumber: false,
        paymentGatewayID: false,
        

      },
    });

    // Handle not found error
    if (!singleBranch) {
      return res.status(400).json({ message: "Branch not found." });
    }

    // Convert weekDays, weekendDays, and weekOffDay to arrays
    const formattedBranch = {
      ...singleBranch,
      weekDays: singleBranch.weekDays ? singleBranch.weekDays.split(",") : [],
      weekendDays: singleBranch.weekendDays ? singleBranch.weekendDays.split(",") : [],
      weekOffDay: singleBranch.weekOffDay ? singleBranch.weekOffDay.split(",") : [],
    };

    // Return the formatted branch
    return res.status(200).json(formattedBranch);
  } catch (error) {
    // Handle internal server errors
    return res.status(400).json({
      message: "An error occurred while fetching the branch",
      error: error.message
    });
  }
};



/**
 * Deletes a single branch by ID.
 * @param {Object} req - The request object containing parameters and authentication information.
 * @param {Object} res - The response object used to return status and JSON data.
 */
const deleteSingleBranch = async (req, res) => {
  try {
    // Check if the user has the necessary permissions to delete a branch
    if (req.auth.userId !== req.auth.sub &&!req.auth.permissions.includes("delete-branch")) {
      return res
        .status(401)
        .json({ message: "Unauthorized. Only admin can delete." });
    }

    // Extract branch ID from request parameters
    const { id } = req.params;

    // Validate if the branch ID is provided
    if (!id) {
      return res.status(400).json({ message: "Branch ID is required" });
    }

    // Check if the branch exists and is not deleted
    const branch = await prisma.branch.findFirst({
      where: {
        id: parseInt(id),
        isDeleted: false
      },
    });

    // If branch is not found, return 404 error
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    // Perform a soft delete on the branch
    const deletedBranch = await prisma.branch.update({
      where: {
        id: parseInt(id),
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.auth.userId,
      },
      include: {
        createdAt: false,
        updatedAt: false,
        isDeleted: false,
        deletedAt: false,
        deletedBy: false,
        createdBy: false,
        updatedBy: false,
      },
    });

    // Return success message with deleted branch details
    return res.status(200).json({
      message: "Branch deleted successfully",
      setting: deletedBranch,
    });
  } catch (error) {
    // Handle internal server errors
    return res.status(400).json({
      error: error.message,
    });
  }
};

module.exports = {
  addBranch,
  getAllBranch,
  getSingleBranch,
  updateSingleBranch,
  deleteSingleBranch,
  getSingleBranchDetails,
};
