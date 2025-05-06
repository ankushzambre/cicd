const prisma = require("../../../utils/prisma");


// Add Table
/**
 * @api {post} /tables Add a new table
 * @apiName AddTable
 * @apiGroup Table
 * @apiPermission admin
 *
 * @apiParam {string} tableName Name of the table
 * @apiParam {number} tableSize Size of the table
 * @apiParam {string} tableShape Shape of the table
 *
 * @apiSuccess {object} createTableResult The newly created table data
 * @apiSuccess {string} message Success message
 *
 * @apiError {object} 400 Validation error
 * @apiError {object} 401 Unauthorized (only admins can add tables)
 */
const addTable = async (req, res) => {
  try {
    // Check if user has permission to create table
    if (req.auth.userId !== req.auth.sub && !req.auth.permissions.includes("create-table")) {
      return res.status(401).json({ message: "Unauthorized. You are not an admin" });
    }
    const data = req.body;

    // Validate required fields
    if (!data.tableName) {
      return res.status(400).send({ message: "tableName is required." });
    }
    if (!data.tableSize) {
      return res.status(400).send({ message: "tableSize is required." });
    }
    if (!data.tableShape) {
      return res.status(400).send({ message: "tableShape is required." });
    }
    console.log("Auth:", req.auth);

    // Check if table with the same name already exists
    const tableFound = await prisma.table.findMany({
      where: {
        branchId: req.auth.branchId,
        isDeleted: false,
        OR: [
          { tableName: { equals: req.body.tableName, mode: "insensitive" } },
        ],
      },
    });

    if (tableFound.length > 0) {
      return res.status(400).send({ message: "Table already exists with the same name.", tableFound });
    }
    console.log(req.auth.userId);
    // Create new table
    const createTableResult = await prisma.table.create({
      data: {
        tableName: req.body.tableName,
        tableSize: req.body.tableSize,
        tableShape: req.body.tableShape,
        branchId: req.auth.branchId,
        createdBy: req.auth.userId,
        updatedBy: req.auth.userId,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedBy: null,
      },
      include: {
        createdAt: false,
        updatedAt: false,
        deletedAt: false,
        branchId: false,
        isDeleted: false,
        createdBy: false,
        updatedBy: false,
        deletedBy: false
      },
    });

    // Return success response
    return res.status(201).send({ message: "Table added successfully", createTableResult });
  } catch (error) {
    // Handle errors
    return res.status(400).send({ message: error.message });
  }
};

// Get all tables list
/**
 * Get all table records for the branch
 * @function getAllTables
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @returns {Promise<void>} - A promise that resolves when the response is sent
 */
const getAllTables = async (req, res) => {
  try {
    if (
      !req.auth.permissions.includes("readAll-table")
    ) {
      return res
        .status(401)
        .json({ message: "Unauthorized. You are not an admin" });
    }

    // Get all tables for the branch
    const tableList = await prisma.table.findMany({
      where: {
        branchId: req.auth.branchId,
        isDeleted: false
      },
      orderBy: {
        id: "asc",
      },
      include: {
        createdAt: false,
        updatedAt: false,
        deletedAt: false,
        branchId: false,
        isDeleted: false,
        createdBy: false,
        updatedBy: false,
        deletedBy: false
      },
    });

    // Return the table list and count
    const response = {
      tableList: tableList,
      tableListCount: tableList.length
    };
    return res.status(200).json(response);
  } catch (error) {
    // Handle errors
    return res.status(400).json({ error: error.message });
  }
};

// Get single table record details
/**
 * Get single table record for the given id
 * @function getSingleTable
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @returns {Promise<void>} - A promise that resolves when the response is sent
 */
const getSingleTable = async (req, res) => {
  try {
    // Check if user has permission to read single table
    if (
      !req.auth.permissions.includes("readSingle-table")
    ) {
      return res
        .status(401)
        .json({ message: "Unauthorized. You are not an admin" });
    }
    // Get single table record
    const getSingleTableRecord = await prisma.table.findFirst({
      where: {
        id: parseInt(req.params.id),
        branchId: req.auth.branchId,
        isDeleted: false
      },
      include: {
        createdAt: false,
        updatedAt: false,
        deletedAt: false,
        isDeleted: false,
        branchId: false,
        createdBy: false,
        updatedBy: false,
        deletedBy: false
      },
    });
    if (getSingleTableRecord) {
      // Return the single table record
      return res.status(200).json(getSingleTableRecord);
    }
    // Return error if table record not found
    return res.status(400).json({ message: "Table details not found." });
  } catch (error) {
    // Handle errors
    return res.status(400).json({ error: error.message });
  }
};

// Update table details
/**
 * Update table details
 * @function updateTable
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @returns {Promise<void>} - A promise that resolves when the response is sent
 */
const updateTable = async (req, res) => {
  try {
    // Check if user has permission to update tables
    if (req.auth.userId !== req.auth.sub &&
      !req.auth.permissions.includes("update-table")
    ) {
      return res
        .status(401)
        .json({ message: "Unauthorized. You are not an admin" });
    }

    // Validate the request body
    if (!req.body.tableName) {
      return res.status(400).send({ message: "tableName is required." });
    }
    if (!req.body.tableSize) {
      return res.status(400).send({ message: "tableSize is required." });
    }
    if (!req.body.tableShape) {
      return res.status(400).send({ message: "tableShape is required." });
    }

    // Check if the table exists
    const tableAlreadyExist = await prisma.table.findMany({
      where: {
        id: parseInt(req.params.id),
        branchId: req.auth.branchId,
        isDeleted: false
      }
    });

    if (tableAlreadyExist.length == 0) {
      return res.status(400).send({ message: "Table record not found" });
    } else {
      // Check if there is already a table with the same name
      let tableFound = await prisma.table.findMany({
        where: {
          OR: [
            { tableName: { equals: req.body.tableName, mode: "insensitive" } },
          ],
          isDeleted: false,
          NOT: {
            id: parseInt(req.params.id),
          }
        },
      });

      if (tableFound.length > 0) {
        return res.status(400).send({
          message: "Table is already exist for the same name or number.",
          tableFound
        });
      } else {
        // Update the table
        const createTableResult = await prisma.table.update({
          where: {
            id: parseInt(req.params.id),
          },
          data: {
            "tableName": req.body.tableName,
            "tableSize": req.body.tableSize,
            "tableShape": req.body.tableShape,
            "updatedBy": req.auth.userId,
            "updatedAt": new Date(),
          },
          include: {
            createdAt: false,
            updatedAt: false,
            deletedAt: false,
            branchId: false,
            isDeleted: false,
            createdBy: false,
            updatedBy: false,
            deletedBy: false
          },
        });

        // Return the updated table
        return res.status(200).send({
          message: "Table updated successfully",
          createTableResult
        });
      }
    }
  } catch (error) {
    // Handle errors
    return res.status(400).json({ error: error.message });
  }
};

// Delete table
/**
 * Deletes a table by ID. Only admins can delete tables.
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 */
const deleteTable = async (req, res) => {
  try {
    // Check if user has permission to delete table
    if (req.auth.userId !== req.auth.sub &&
      !req.auth.permissions.includes("delete-table")
    ) {
      return res
        .status(401)
        .json({ message: "Unauthorized. You are not an admin" });
    }

    // Check if the table exists
    const existingTable = await prisma.table.findFirst({
      where: {
        id: Number(req.params.id),
        branchId: req.auth.branchId,
        isDeleted: false,
      },
    });

    if (!existingTable) {
      return res.status(400).json({ message: "Table not found" });
    }

    // Delete the table if it exists
    await prisma.table.update({
      where: { id: Number(req.params.id), },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.auth.userId,

      },
      include: {
        createdAt: false,
        updatedAt: false,
        deletedAt: false,
        branchId: false,
        isDeleted: false,
        createdBy: false,
        updatedBy: false, 
        deletedBy: false
      },
    });

    return res.status(200).json({ message: "Table deleted successfully" });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};


module.exports = {
  addTable,
  getAllTables,
  getSingleTable,
  updateTable,
  deleteTable,
};