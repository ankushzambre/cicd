const prisma = require("../../utils/prisma");
const { getPagination } = require("../../utils/query");
require("dotenv").config();
const Email = require("../../utils/email");
const fs = require('fs');
const path = require('path');
const emailTemplatePath = path.join(__dirname, '../../utils/emailReservationTemplate.html');
let emailTemplateHtml = fs.readFileSync(emailTemplatePath, 'utf-8');



/**
 * Fetch available tables for booking.
 * 
 * @param {string} bookingDate - The date for which the booking is requested.
 * @param {string} bookingFor - The type of booking (e.g., Lunch, Dinner).
 * @param {number} guestSize - The number of guests for the booking.
 * @returns {object} - An object containing booking message and booked tables.
 * @throws Will throw an error if validation fails or no tables are available.
 */


const fetchAvailableTables = async (bookingDate, bookingFor, guestSize) => {
    try {

        // Validate input parameters
        if (!guestSize || !bookingDate || !bookingFor) {
            throw { status: 400, error: "Missing required fields." };
        }
        console.log("Test 1");
        
        // Get maximum booking size for the branch
        const branch = await prisma.branch.findUnique({
            where: { id: 1 },
            select: { maxGuestSize: true },
        });
        console.log("Test 2");

        if (!branch) {
            throw { status: 400, error: "Branch not found." };
        }
        // Fetch Taste Menu Details based on the provided date
        const bookingDate1 = new Date(bookingDate);
        const dayOfWeek = bookingDate1.toLocaleDateString("en-IN", { weekday: "long" });

        const tasteMenu = await prisma.tasteMenu.findMany({
            where: {
                days: { contains: dayOfWeek },  // Check if the menu is available on this day
                type: bookingFor.toLowerCase(),
                isDeleted: false
            }
        });
        console.log("Test 3");
        if (!tasteMenu || tasteMenu.length === 0) {

            throw { status: 400, message: `No taste menu found for ${dayOfWeek} (${bookingFor}).` };
        }
        const maxBookingSize = branch.maxGuestSize;

        // Check if guest size exceeds maximum booking size
        if (guestSize > maxBookingSize) {
            throw { status: 400, error: "Please contact admin for bulk booking." };
        }

        // Fetch already booked tables for the given date and booking type
        console.log("Test 4");
        const existingReservations = await prisma.reservationsTableDetail.findMany({
            where: {
                reservations: {
                    reservationDate: new Date(bookingDate),
                    reservationType: bookingFor,
                },
            },
            select: { tableId: true },
        });


        // Extract booked table IDs
        console.log("Test 5");
        const bookedTableIds = existingReservations.map(reservation => reservation.tableId);

        // Fetch only available tables that are not already booked
        const availableTables = await prisma.table.findMany({
            where: {
                isDeleted: false,
                id: { notIn: bookedTableIds },
            },
        });


        // Check if any tables are available
        if (availableTables.length <= 0) {
            throw { status: 400, message: "All tables are booked. Please contact admin for booking." };
        } else {
        console.log("Test 6");
            var filteredTable = availableTables.filter(function (table) {
                return guestSize <= table.tableSize;
            });


            // Book a single table if available
            if (filteredTable.length > 0) {
                return {
                    message: `The ${filteredTable[0].tableName} is available on ${bookingDate} for ${bookingFor}.`,
                    bookedTables: [filteredTable[0]],
                };
            } else {
                var totalAvailableTableSize = availableTables.reduce((n, { tableSize }) => n + tableSize, 0);
                if (guestSize > totalAvailableTableSize) {
                    throw {
                        status: 400,
                        message: `No table available for ${guestSize} guests. The available table size is ${totalAvailableTableSize}.`,
                        totalAvailableTableSize: totalAvailableTableSize,
                        availableTables: availableTables,
                    };
                } else {

                    // Table combine logic we will
                    var remainingGuest = 0, count = 0, tableBookingList = [];

                    do {
                        if (remainingGuest == 0) {
                            remainingGuest = guestSize - availableTables[count].tableSize;
                        } else {
                            remainingGuest = remainingGuest - availableTables[count].tableSize;
                        }
                        tableBookingList.push(availableTables[count]);
                        count++;
                    } while (remainingGuest > 0);

                    var message = "";
                    for (let index = 0; index < tableBookingList.length; index++) {
                        message = message + tableBookingList[index].tableName + " ";
                    }

                    var message = tableBookingList.map(table => table.tableName).join(", ");
                    return {
                        message: `The ${message} is available on ${bookingDate} for ${bookingFor}.`,
                        bookedTables: tableBookingList
                    };
                }
            }
        }
    } catch (error) {
        throw error.status ? error : { status: 400, error: "Unable to check availability of tables", error:error };
    }
};

// create reservation


/**
 * @description Creates a new reservation and sends a confirmation email to the user.
 * @param {Object} req - Request object containing the reservation details.
 * @param {Object} res - Response object to send the response back to the client.
 * @returns {Promise<Object>} - Promise resolving to the response object.
 */


const addReservation = async (req, res) => {
    try {
        // Validate required fields
        const { numberOfGuest, reservationDate, reservationType, name, phoneNumber, email, reservationMode, paymentType, voucherId, userId, branchId, guests, originalAmount, voucherDiscount, CGST, SGST, finalAmount, transactionCode, transactionDetails, status, } = req.body;

        if (!numberOfGuest || !reservationDate || !reservationType || !name || !phoneNumber || !email || !reservationMode || !paymentType || !originalAmount || !SGST || !finalAmount) {
            return res.status(400).send({ message: "All fields are required." });
        }

        // Convert reservationDate to Date object
        const reservationDateObj = new Date(reservationDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time for accurate comparison

        if (reservationDateObj < today) {
            return res.status(400).json({ message: "Reservation date cannot be a past date." });
        }

        // **Check Table Availability First**
        const tableResponse = await fetchAvailableTables(reservationDate, reservationType, numberOfGuest);

        // If no tables are available, return an error response
        if (!tableResponse.bookedTables) {
            return res.status(400).json({ message: "No available tables. Please choose another date or contact admin." });
        }


        // Fetch Taste Menu Details based on the provided date
        const bookingDate = new Date(reservationDate);
        const dayOfWeek = bookingDate.toLocaleDateString("en-IN", { weekday: "long" });

        const tasteMenu = await prisma.tasteMenu.findMany({
            where: {
                days: { contains: dayOfWeek },  // Check if the menu is available on this day
                type: reservationType.toLowerCase(),
                isDeleted: false
            }
        });
        if (!tasteMenu || tasteMenu.length === 0) {
            return res.status(404).json({
                message: `No taste menu found for ${dayOfWeek} (${reservationType}).`
            });
        }

        // Prepare guest details if provided or use default
        let guestDetails = [];
        for (let i = 0; i < numberOfGuest; i++) {
            // If guest details are provided, use those; otherwise, use default values
            const guest = guests && guests[i] ? guests[i] : {
                name: `Guest ${i + 1}`,
                foodPreference: 'Veg',
                anyAlergies: 'None',
            };
            guestDetails.push(guest);
        }

        // Create new reservation
        const newReservation = await prisma.reservations.create({
            data: {
                numberOfGuest: parseInt(numberOfGuest),
                reservationDate: reservationDateObj,
                reservationType,
                name,
                phoneNumber,
                email,
                reservationMode,
                paymentType,
                voucherId,
                originalAmount,
                voucherDiscount,
                CGST,
                SGST,
                finalAmount,
                transactionCode,
                transactionDetails,
                status,
                userId: parseInt(userId) || 1,
                branchId: parseInt(branchId) || 1,
                createdAt: new Date(),
                updatedAt: new Date(),
                reservationsGuestDetails: {
                    create: guestDetails.map(guest => ({
                        name: guest.name,
                        foodPreference: guest.foodPreference,
                        anyAlergies: guest.anyAlergies,
                    })),
                },
                reservationsTableDetail: {
                    create: tableResponse.bookedTables.map(table => ({
                        tableId: table.id,
                    })),
                },
                reservationsMenuDetail: {
                    create: tasteMenu.map(menu => ({
                        menuId: menu.id,
                    })),
                },
            },
            include: {
                reservationsMenuDetail: true,
                reservationsGuestDetails: true,
                reservationsTableDetail: true,
                createdAt: false,
                updatedAt: false,
                isDeleted: false,
            },
        });
        // Format table details into a list
        const tableDetailsHTML = tableResponse.bookedTables.map(
            (table) => table.tableName
        ).join("");



        // Replace placeholders with actual data
        emailBody = emailTemplateHtml
            .replace('${name}', name)
            .replace('${data.name}', name)
            .replace('${phoneNumber}', phoneNumber)
            .replace('${email}', email)
            .replace('${numberOfGuest}', numberOfGuest)
            .replace('${reservationDate}', reservationDate)
            .replace('${reservationType}', reservationType)
            .replace('${reservationMode}', reservationMode)
            .replace('${paymentType}', paymentType)
            .replace('${finalAmount}', finalAmount)
            .replace('${tableDetailsHTML}', tableDetailsHTML);

        // Send email
        const reservationEmail = await Email.email(
            email,
            `Reservation Confirmation - ${name}`,
            emailBody
        );
        if (reservationEmail.error) {
            return res.status(400).json({ error: reservationEmail.error });
        }
        return res.status(201).json({ message: "Reservation created successfully. A confirmation email has been sent.", reservation: newReservation });
   } catch (error) {
    if (error.status) {
        return res.status(error.status).json(error);
    }
    return res.status(400).json({ message: "Unable to create reservation", error });
}

};



/**
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Number} guestSize - The number of guests
 * @param {String} date - The date of the reservation
 * @param {String} type - The type of reservation
 */

const getAvailableTables = async (req, res) => {
    try {
        const { guestSize, date, type } = req.body;
        if (!guestSize || !date || !type) {
            return res.status(400).json({ message: "Missing required fields." });
        }

        // Fetch available tables based on the provided date and type
        const tableResponse = await fetchAvailableTables(date, type, guestSize);

        // Fetch Taste Menu Details based on the provided date
        const bookingDate = new Date(date);
        const dayOfWeek = bookingDate.toLocaleDateString("en-IN", { weekday: "long" });

        const tasteMenu = await prisma.tasteMenu.findMany({
            where: {
                days: { contains: dayOfWeek },  // Check if the menu is available on this day
                type: type.toLowerCase(),
                isDeleted: false
            }
        });
        if (!tasteMenu || tasteMenu.length === 0) {
            return res.status(404).json({
                message: `No taste menu found for ${dayOfWeek} (${type}).`
            });
        }

        res.status(200).json({
            ...tableResponse,
            tasteMenu
        });
    } catch (error) {
    if (error.status) {
        return res.status(error.status).json(error);
    }
    return res.status(400).json({ message: "Unable to fetch available tables", error:error.message });
}
};

//update reservation
/**
 * Updates a single reservation
 * @param {Object} req - Request object containing the reservation details to update.
 * @param {Object} res - Response object to send the response back to the client.
 * @returns {Promise<Object>} - Promise resolving to the response object.
 */
const updateSingleReservation = async (req, res) => {
    try {
        const userId = req.auth.sub;

        // Authorization Check
        if (
            userId !== req.auth.sub &&
            !req.auth.permissions.includes("update-reservations")
        ) {
            return res.status(403).json({ message: "Unauthorized. You are not an admin." });
        }
        const reservationId = parseInt(req.params.id);
        const updatedData = {
            ...req.body,
            updatedAt: new Date(),
        };

        // Fetch existing reservation details
        const existingReservation = await prisma.reservations.findUnique({
            where: { id: reservationId },
            select: {
                numberOfGuest: true,
                reservationDate: true,
                reservationType: true,
            },
        });

        if (!existingReservation) {
            return res.status(404).json({ message: "Reservation not found." });
        }

        // Convert reservationDate to Date object for comparison
        const updatedReservationDate = new Date(updatedData.reservationDate);
        const existingReservationDate = new Date(existingReservation.reservationDate);

        // Check if fields have changed
        const isGuestChanged = existingReservation.numberOfGuest !== updatedData.numberOfGuest;
        const isDateChanged = existingReservationDate.getTime() !== updatedReservationDate.getTime();
        const isTypeChanged = existingReservation.reservationType !== updatedData.reservationType;

        // Prevent changes to guest size and type together, or guest size alone
        if (isTypeChanged) {
            return res.status(400).json({ message: "You cannot change reservation type." });
        }
        if (isGuestChanged) {
            return res.status(400).json({ message: "You cannot change guest size." });
        }
        // If only the date has changed, check table availability
        if (isDateChanged && !isGuestChanged && !isTypeChanged) {
            const bookingDate = updatedReservationDate;
            const dayOfWeek = bookingDate.toLocaleDateString("en-IN", { weekday: "long" });

            const tasteMenu = await prisma.tasteMenu.findMany({
                where: {
                    days: { contains: dayOfWeek }, // Check if the menu is available on this day
                    type: existingReservation.reservationType.toLowerCase(),
                    isDeleted: false,
                },
            });


            if (!tasteMenu || tasteMenu.length === 0) {
                return res.status(404).json({
                    message: `No taste menu found for ${dayOfWeek} (${existingReservation.reservationType}).`,
                });
            }

            const tableResponse = await fetchAvailableTables(
                updatedReservationDate,
                existingReservation.reservationType,
                existingReservation.numberOfGuest
            );

            if (!tableResponse.bookedTables) {
                return res.status(400).json({
                    message: "No available tables for this reservation date.",
                });
            }

            // Update the reservation table details with the new booked tables
            updatedData.reservationsTableDetail = {
                deleteMany: {}, // Remove previous table assignments
                create: tableResponse.bookedTables.map(table => ({
                    tableId: table.id,
                })),
            };
        }

        // Proceed with the update
        const updateReservation = await prisma.reservations.update({
            where: { id: reservationId },
            data: updatedData,
            include: {
                reservationsTableDetail: true,
            },
        });

        return res.status(200).json({
            message: "Reservation updated successfully.",
            reservation: updateReservation,
        });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};


/**
 * @function getAllReservation
 * @description Get all reservations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getAllReservation = async (req, res) => {
    if (req.query.query === "all") {
        try {
            // Authorization Check
            if (
                !req.auth.permissions.includes("readAll-reservations")
            ) {
                return res.status(403).json({ message: "Unauthorized. You are not an admin." });
            }
            const { skip, limit } = getPagination(req.query);
            const sortField = req.query.sortField || "id";
            const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

            // Create dynamic search filter from req.body
            let searchFilter = {};
            if (req.query.searchValue) {
                const searchValue = req.query.searchValue;
                searchFilter = {
                    OR: [
                        { name: { contains: searchValue, mode: "insensitive" } },
                        { phoneNumber: { contains: searchValue, mode: "insensitive" } },
                        { email: { contains: searchValue, mode: "insensitive" } },
                        { reservationMode: { contains: searchValue, mode: "insensitive" } },
                        { reservationType: { contains: searchValue, mode: "insensitive" } },
                        { paymentType: { contains: searchValue, mode: "insensitive" } },
                        { status: { contains: searchValue, mode: "insensitive" } },
                    ],
                };
            }
            // Date filter (if reservationDate is provided)
            let dateFilter = {};
            if (req.query.reservationDate) {
                const reservationDate = new Date(req.query.reservationDate);
                dateFilter = {
                    reservationDate: {
                        gte: new Date(reservationDate.setHours(0, 0, 0, 0)), // Start of the day
                        lt: new Date(reservationDate.setHours(23, 59, 59, 999)), // End of the day
                    },
                };
            }

            // Get total count of reservations without pagination
            const totalReservations = await prisma.reservations.count({
                where: {
                    NOT: { isDeleted: true }
                },

            });

            const allReservation = await prisma.reservations.findMany({
                where: {
                    AND: [
                        { NOT: { isDeleted: true } }, // Exclude deleted records
                        searchFilter, // Apply global search
                        dateFilter,   // Apply date filter
                    ],
                },
                orderBy: [
                    { [sortField]: sortOrder }, // Ensure proper sorting
                ],
                include: {
                    createdAt: false,
                    updatedAt: false,
                    reservationsMenuDetail: {
                        include: {
                            menu: true,
                        }
                    },
                    reservationsGuestDetails: true,
                    reservationsTableDetail: {
                        include: {
                            id: false,
                            reservationId: false,
                            tableId: false,
                            table: {
                                include: {
                                    createdAt: false,
                                    updatedAt: false,
                                    deletedAt: false,
                                    createdBy: false,
                                    updatedBy: false,
                                    deletedBy: false,
                                    branchId: false,
                                }
                            },
                        }
                    },
                },
                skip: Number(skip),
                take: Number(limit),

            });
            return res.status(200).json({
                total: totalReservations,
                reservations: allReservation.map(({ password, ...reservation }) => reservation),
            });


        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    } else if (req.query.status === "true") {
        try {
            // Authorization Check
            if (
                !req.auth.permissions.includes("readAll-reservations")
            ) {
                return res.status(403).json({ message: "Unauthorized. You are not an admin." });
            }

            const { skip, limit } = getPagination(req.query);
            const sortField = req.query.sortField || "id";
            const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";
            // Create dynamic search filter from req.body
            let searchFilter = {};
            if (req.query.searchValue) {
                const searchValue = req.query.searchValue;
                searchFilter = {
                    OR: [
                        { name: { contains: searchValue, mode: "insensitive" } },
                        { phoneNumber: { contains: searchValue, mode: "insensitive" } },
                        { email: { contains: searchValue, mode: "insensitive" } },
                        { reservationMode: { contains: searchValue, mode: "insensitive" } },
                        { reservationType: { contains: searchValue, mode: "insensitive" } },
                        { paymentType: { contains: searchValue, mode: "insensitive" } },
                        { status: { contains: searchValue, mode: "insensitive" } },
                    ],
                };
            }
            // Date filter (if reservationDate is provided)
            let dateFilter = {};
            if (req.query.reservationDate) {
                const reservationDate = new Date(req.query.reservationDate);
                dateFilter = {
                    reservationDate: {
                        gte: new Date(reservationDate.setHours(0, 0, 0, 0)), // Start of the day
                        lt: new Date(reservationDate.setHours(23, 59, 59, 999)), // End of the day
                    },
                };
            }

            // Get total count of reservations without pagination
            const totalReservations = await prisma.reservations.count({
                where: {
                    NOT: { isDeleted: true }
                },

            });
            const allReservation = await prisma.reservations.findMany({
                where: {
                    AND: [
                        { NOT: { isDeleted: true } }, // Exclude deleted records
                        searchFilter, // Apply global search
                        dateFilter,   // Apply date filter
                    ],
                },
                orderBy: [
                    { [sortField]: sortOrder }, // Ensure proper sorting
                ],
                include: {
                    createdAt: false,
                    updatedAt: false,
                    reservationsMenuDetail: {
                        include: {
                            menu: true,
                        }
                    },
                    reservationsGuestDetails: true,
                    reservationsTableDetail: {
                        include: {
                            id: false,
                            reservationId: false,
                            tableId: false,
                            table: {
                                include: {
                                    createdAt: false,
                                    updatedAt: false,
                                    deletedAt: false,
                                    createdBy: false,
                                    updatedBy: false,
                                    deletedBy: false,
                                    branchId: false,
                                }
                            },
                        }
                    },
                },
                skip: Number(skip),
                take: Number(limit),

            });
            return res.status(200).json({
                total: totalReservations,
                reservations: allReservation.map(({ password, ...reservation }) => reservation),
            });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    } else {
        try {
            // Authorization Check
            if (
                !req.auth.permissions.includes("readAll-reservations")
            ) {
                return res.status(403).json({ message: "Unauthorized. You are not an admin." });
            }
            const { skip, limit } = getPagination(req.query);
            const sortField = req.query.sortField || "id";
            const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

            // Create dynamic search filter from req.body
            let searchFilter = {};
            if (req.query.searchValue) {
                const searchValue = req.query.searchValue;
                searchFilter = {
                    OR: [
                        { name: { contains: searchValue, mode: "insensitive" } },
                        { phoneNumber: { contains: searchValue, mode: "insensitive" } },
                        { email: { contains: searchValue, mode: "insensitive" } },
                        { reservationMode: { contains: searchValue, mode: "insensitive" } },
                        { reservationType: { contains: searchValue, mode: "insensitive" } },
                        { paymentType: { contains: searchValue, mode: "insensitive" } },
                        { status: { contains: searchValue, mode: "insensitive" } },
                    ],
                };
            }
            // Date filter (if reservationDate is provided)
            let dateFilter = {};
            if (req.query.reservationDate) {
                const reservationDate = new Date(req.query.reservationDate);
                dateFilter = {
                    reservationDate: {
                        gte: new Date(reservationDate.setHours(0, 0, 0, 0)), // Start of the day
                        lt: new Date(reservationDate.setHours(23, 59, 59, 999)), // End of the day
                    },
                };
            }
            // Get total count of reservations without pagination
            const totalReservations = await prisma.reservations.count({
                where: {
                    NOT: { isDeleted: true }
                },
            });
            const allReservation = await prisma.reservations.findMany({
                where: {
                    AND: [
                        { NOT: { isDeleted: true } }, // Exclude deleted records
                        searchFilter, // Apply global search
                        dateFilter,   // Apply date filter
                    ],
                },
                orderBy: [
                    { [sortField]: sortOrder }, // Ensure proper sorting
                ],
                include: {
                    createdAt: false,
                    updatedAt: false,
                    reservationsMenuDetail: {
                        include: {
                            menu: true
                        }
                    },
                    reservationsGuestDetails: true,
                    reservationsTableDetail: {
                        include: {
                            id: false,
                            reservationId: false,
                            tableId: false,
                            table: {
                                include: {
                                    createdAt: false,
                                    updatedAt: false,
                                    deletedAt: false,
                                    createdBy: false,
                                    updatedBy: false,
                                    deletedBy: false,
                                    branchId: false,
                                }
                            },
                        }
                    },
                },
                skip: Number(skip),
                take: Number(limit),
            });

            const formattedReservationes = allReservation.map((reservation) => {
                const { password, ...reservationWithoutPassword } = reservation;

                return {
                    ...reservationWithoutPassword,
                };
            });
            return res.status(200).json({
                total: totalReservations,
                reservations: formattedReservationes.map(({ password, ...reservation }) => reservation),
            });

        } catch (error) {
            return res.status(400).json({
                message: "An error occurred while fetching the reservation",
                error: error.message
            });
        }
    }
};

//get single reservation
/**
 * GET /reservations/:id
 * Retrieves a single reservation by id
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getSingleReservation = async (req, res) => {
    try {
        // Authorization Check
        // Check if the user has the necessary permissions
        // to read the reservation
        if (
            // userId !== req.auth.sub &&
            !req.auth.permissions.includes("readSingle-reservations")
        ) {
            return res.status(403).json({ message: "Unauthorized. You are not an admin." });
        }
        // Retrieve the reservation
        const singleReservation = await prisma.reservations.findUnique({
            where: {
                id: parseInt(req.params.id),
            },
            include: {
                createdAt: false,
                updatedAt: false,
                reservationsMenuDetail: true,
                reservationsGuestDetails: true,
                reservationsTableDetail: true,
            },
        });

        // Check if the reservation exists
        if (!singleReservation) {
            return res.status(400).json({ message: "Reservation not found." });
        }
        // Format the reservation without the password
        const formattedReservation = {
            ...singleReservation,
        };

        // Return the reservation
        return res.status(200).json(formattedReservation);
    } catch (error) {
        // Handle any errors
        return res.status(400).json({
            message: "An error occurred while fetching the reservation",
            error: error.message
        });
    }
};

/**
 * DELETE /reservations/:id
 * Deletes a single reservation by id
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const deleteSingleReservation = async (req, res) => {
    try {
        // Authorization Check
        if (!req.auth.permissions.includes("delete-reservations")) {
            return res.status(403).json({ message: "Unauthorized. You are not an admin." });
        }

        // Get reservation ID from request parameters
        const { id } = req.params;

        // Validate if reservation ID is provided
        if (!id) {
            return res.status(400).json({ message: "Reservation ID is required" });
        }

        // Check if reservation exists and is not deleted
        const reservation = await prisma.reservations.findFirst({
            where: {
                id: parseInt(id),
                isDeleted: false
            },
        });

        // If reservation is not found, return 404 error
        if (!reservation) {
            return res.status(404).json({ message: "Reservation not found" });
        }
         // Delete all related reservation table details
        await prisma.reservationsTableDetail.deleteMany({
            where: {
                reservationId: parseInt(id),
            },
        });
        // Perform a soft delete on the reservation
        const deletedReservation = await prisma.reservations.update({
            where: {
                id: parseInt(id),
            },
            data: {
                isDeleted: true,
            },
        });

        // Return success response
        return res.status(200).json({
            message: "Reservation deleted successfully",
            setting: deletedReservation,
        });

    } catch (error) {
        // Handle errors
        return res.status(400).json({
            error: error.message,
        });
    }
};

module.exports = {
    getAvailableTables,
    addReservation,
    getAllReservation,
    getSingleReservation,
    updateSingleReservation,
    deleteSingleReservation,
};
