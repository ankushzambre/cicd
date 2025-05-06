const prisma = require("../../../utils/prisma");
require("dotenv").config();
const Email = require("../../../utils/email");
const fs = require('fs');
const path = require('path');
const emailTemplatePath = path.join(__dirname, '../../../utils/emailWaitingTemplate.html');
let emailTemplateHtml = fs.readFileSync(emailTemplatePath, 'utf-8');

/**
 * Add a new record to the waiting list.
 * @param {Object} req - The request object containing waiting list details.
 * @param {Object} res - The response object for sending responses.
 */

const addWaitingList = async (req, res) => {
  try {
    const data = req.body;

    // Validate required fields
    if (!data.name) {
      return res.status(400).send({ message: "Name is required." });
    }
    if (!data.email) {
      return res.status(400).send({ message: "Email is required." });
    }
    if (!data.phoneNumber) {
      return res.status(400).send({ message: "Phone number is required." });
    }
    if (!data.numberOfGuest) {
      return res.status(400).send({ message: "Number of guests is required." });
    }
    if (!data.reservationDate) {
      return res.status(400).send({ message: "Reservation date is required." });
    }
    if (!data.reservationSlot) {
      return res.status(400).send({ message: "Reservation slot is required." });
    }

    // Create new waiting list entry
    const createWaitingList = await prisma.waitingList.create({
      data: {
        name: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber,
        numberOfGuest: data.numberOfGuest,
        reservationDate: new Date(data.reservationDate),
        reservationSlot: data.reservationSlot,
        branchId: 1,
      },
      include: {
        createdAt: false,
        branchId: false,
        isDeleted: false,
      },
    });  
    const adminEmailBody = emailTemplateHtml
      .replace('${name}', data.name)
      .replace('${data.name}', data.name)
      .replace('${email}', data.email)
      .replace('${phoneNumber}', data.phoneNumber)
      .replace('${numberOfGuest}', data.numberOfGuest)
      .replace('${reservationDate}', data.reservationDate)
      .replace('${data.reservationDate}', data.reservationDate)
      .replace('${reservationSlot}', data.reservationSlot);


    // Send email to admin
    const adminEmail = await Email.email(
      process.env.EMAIL_USER,
      `New Waiting List Reservation - ${data.name}`,
      adminEmailBody
    );

    if (adminEmail.error) {
      return res.status(400).json({ error: adminEmail.error });
    }

    return res.status(201).json({
      message: "Added to waiting list successfully. Admin has been notified.",
      waitingList: createWaitingList,
    });
  } catch (error) {
    // Handle and return error response
    return res.status(400).send({ message: error.message });
  }
};

/**
 * Get all records from the waiting list.
 * 
 * @param {Object} req - The request object, which includes authentication details.
 * @param {Object} res - The response object for sending responses.
 * @returns {Object} - JSON response with the list of waiting records and their count.
 */
const getAllWaitingList = async (req, res) => {
  try {
    // Check if the user has the required permissions
    if (!req.auth.permissions.includes("readAll-waitingList")) {
      return res.status(401).json({ message: "Unauthorized. You are not an admin" });
    }
    
    // Fetch the waiting list records from the database
    const waitingList = await prisma.waitingList.findMany({
      where: {
        branchId: req.auth.branchId,
        isDeleted: false
      },
      orderBy: {
        id: "asc",
      }
    });

    // Prepare and send the response
    const response = {
      waitingList: waitingList,
      waitingListCount: waitingList.length
    };
    return res.status(200).json(response);
  } catch (error) {
    // Handle and return error response
    return res.status(400).json({ error: error.message });
  }
};

/**
 * Deletes a waiting list record by ID. Only authorized users can perform this action.
 * @param {Object} req - The request object containing authentication and parameters.
 * @param {Object} res - The response object for sending responses.
 * @returns {Object} - JSON response indicating success or error message.
 */
const deleteWaitingList = async (req, res) => {
  try {
    // Check if user has permission to delete a waiting list record
    if (!req.auth.permissions.includes("delete-waitingList")) {
      return res.status(403).json({ message: "Unauthorized. You are not an admin" });
    }

    // Perform a soft delete on the waiting list record by setting isDeleted to true
    await prisma.waitingList.update({
      where: { id: Number(req.params.id) },
      data: {
        isDeleted: true
      },
      include: {
        createdAt: false
      },
    });

    // Return a success message if the record is deleted successfully
    return res.status(200).json({ message: "Waiting record deleted successfully" });
  } catch (error) {
    // Catch any errors and return a 400 status with the error message
    return res.status(400).json({ error: error.message });
  }
};


module.exports = {
  addWaitingList,
  getAllWaitingList,
  deleteWaitingList
};