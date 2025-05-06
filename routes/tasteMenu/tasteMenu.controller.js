
const prisma = require("../../utils/prisma");
const { uploadToS3, generateSignedUrl } = require("../../utils/upload");

// Add Testing Menu
/**
 * Create a new Taste Menu. 
 * @param {Object} req - The request object containing the daily menu details.
 * @param {Object} res - The response object to send the response back to the client.
 * @returns {JSON} - A JSON object containing the newly created menu.
 */
const addtasteMenu = async (req, res) => {
    try {
        // Check if the user has the required permission
        if (req.auth.userId !== req.auth.sub &&
            !req.auth.permissions.includes("create-tasteMenu")) {
            return res.status(401).json({ message: "Unauthorized. You are not an admin" });
        }

        const { title, description, type, price, days } = req.body;

        // Validate all required fields are present
        if (!title || !type || !price || !days) {
            return res.status(400).send({ message: "All fields are required." });
        }

        // Convert days to an array
        const selectedDays = days.split(",");

        // Check if any of the selected days are already assigned to a menu of the same type
        const existingMenus = await prisma.tasteMenu.findMany({
            where: {
                type: type.toLowerCase(),  // Dynamic check based on type
                branchId: req.auth.branchId,
                isDeleted: false
            },
            select: {
                days: true,
            }
        });

        const assignedDays = new Set();
        existingMenus.forEach(menu => {
            menu.days.split(",").forEach(day => assignedDays.add(day));
        });

        const conflictDays = selectedDays.filter(day => assignedDays.has(day));

        // Check if any of the selected days are already assigned
        if (conflictDays.length > 0) {
            return res.status(400).json({
                message: `This day(s) ${conflictDays.join(", ")} already assigned for ${type}.`
            });
        }

        // Upload Image to S3 if provided
        let imageUrl = null;
        if (req.file) {
            imageUrl = await uploadToS3(req.file);
        } else {
            imageUrl = "https://dev-valuelens.s3.ap-south-1.amazonaws.com/1744094323790-download (1).jpg"; // Provide your actual default profile image URL
        }

        const newMenu = await prisma.tasteMenu.create({
            data: {
                title,
                description,
                type: type.toLowerCase(),
                price: parseFloat(price),
                days: days, // Stored as a comma-separated string
                image: imageUrl,
                branchId: req.auth.branchId,
                createdAt: new Date(),
                updatedAt: new Date(),
                isDeleted: false,
                deletedAt: null,
                createdBy: req.auth.userId,
                updatedBy: req.auth.userId,
                deletedBy: null,


            },
            include: {
                updatedAt: false,
                createdAt: false,
                branchId: false,
                isDeleted: false,
                deletedAt: false,
                createdBy: false,
                updatedBy: false,
                deletedBy: false    
                
            }
        });

        // Generate signed URL if image exists
        const signedImageUrl = await generateSignedUrl(newMenu.image);

        return res.status(201).json({
            message: "Menu added successfully",
            menu: {
                ...newMenu,
                days: newMenu.days.split(","), // Convert stored string to array in response
                image: signedImageUrl  // Include the signed URL in response
            }
        });
    } catch (error) {
        // Catch any internal server errors
        return res.status(400).json({
            message: "Unable to create taste menu",
            error: error.message
        });
    }
};

// Get All Testing Menus
/**
 * Retrieves all testing menus that are not deleted.
 * @param {IncomingMessage} req - Request object from Express
 * @param {ServerResponse} res - Response object from Express
 * @return {Promise<void>}
 */
const getAlltasteMenus = async (req, res) => {
    try {
        // Retrieve all testing menus
        const menus = await prisma.tasteMenu.findMany({
            where: {
                isDeleted: false,
                // branchId: req.auth.branchId // TODO: Add branch filtering
            },
            include: {
                updatedAt: false,
                createdAt: false,
                branchId: false,
                isDeleted: false,
                deletedAt: false,
                createdBy: false,
                updatedBy: false,
                deletedBy: false
            
            }
        });

        // Generate signed URLs for images
        const allMenus = await Promise.all(menus.map(async (menu) => ({
            ...menu,
            days: menu.days.split(","),
            image: await generateSignedUrl(menu.image) // Replace image with signed URL
        })));

        // Return the list of menus
        return res.status(200).json(allMenus);
    } catch (error) {
        // Catch any internal server errors
        return res.status(400).json({ message: error.message });
    }
};


// Get Single Testing Menu
/**
 * Retrieves a single testing menu by ID for the authenticated user's branch.
 * @param {Object} req - Request object from Express
 * @param {Object} res - Response object from Express
 * @return {Promise<void>}
 */
const getSingletasteMenu = async (req, res) => {
    try {
        // Check if the user has the required permission
        if (!req.auth.permissions.includes("readSingle-tasteMenu")) {
            return res.status(401).json({ message: "Unauthorized. You are not an admin" });
        }

        // Fetch the menu record by ID for the authenticated user's branch
        const menu = await prisma.tasteMenu.findUnique({
            where: {
                id: parseInt(req.params.id),
                branchId: req.auth.branchId,
                isDeleted: false
            },
            include: {
                updatedAt: false,
                createdAt: false,
                branchId: false,
                isDeleted: false,
                deletedAt: false,
                createdBy: false,
                updatedBy: false,
                deletedBy: false
            }
        });

        // Return 404 if the menu record is not found
        if (!menu) {
            return res.status(404).json({ message: "Menu not found" });
        }

        // Generate signed URL for the image
        const signedImageUrl = await generateSignedUrl(menu.image);

        // Convert `days` string into an array
        return res.status(200).json({
            ...menu,
            days: menu.days ? menu.days.split(",") : [], // Ensure it returns an array
            image: signedImageUrl // Set the signed image URL
        });

    } catch (error) {
        // Catch any internal server errors
        return res.status(400).json({ message: error.message });
    }
};

// Update Testing Menu
/**
 * Updates a single testing menu by ID for the authenticated user's branch.
 * @param {Object} req - Request object from Express
 * @param {Object} res - Response object from Express
 * @return {Promise<void>}
 */
const updatetasteMenu = async (req, res) => {
    try {
        // Check if the user has the required permission
        if (
            req.auth.userId !== req.auth.sub &&!req.auth.permissions.includes("update-tasteMenu")) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Get the menu details from the request body
        const { title, description, type, price, days } = req.body;

        // Check if all fields are present
        if (!title || !type || !price || !days) {
            return res.status(400).send({ message: "All fields are required." });
        }

        // Split the selected days into an array
        const selectedDays = days.split(",");

        // Check if any of the selected days are already assigned to a menu of the same type (excluding the current menu)
        const existingMenus = await prisma.tasteMenu.findMany({
            where: {
                type: type.toLowerCase(),
                branchId: req.auth.branchId,
                NOT: { id: parseInt(req.params.id) },
                isDeleted: false
            },

            select: {
                days: true,
            }
        });

        // Create a Set of the assigned days to check for conflicts
        const assignedDays = new Set();
        existingMenus.forEach(menu => {
            menu.days.split(",").forEach(day => assignedDays.add(day));
        });

        // Check if any of the selected days are already assigned to a menu of the same type
        const conflictDays = selectedDays.filter(day => assignedDays.has(day));

        // Return 400 if any conflicts are found
        if (conflictDays.length > 0) {
            return res.status(400).json({
                message: `This day(s) ${conflictDays.join(", ")} already assigned for ${type}.`
            });
        }

        // Upload the image if it exists
        let imageUrl = null;
        if (req.file) {
            imageUrl = await uploadToS3(req.file);
        }

        // Update the menu record
        const updatedMenu = await prisma.tasteMenu.update({
            where: { id: parseInt(req.params.id) },
            data: {
                title,
                description,
                type,
                price: parseFloat(price),
                days, // Store as a comma-separated string
                image: imageUrl ? imageUrl : undefined,
                branchId: req.auth.branchId,
                updatedAt: new Date(),
                updatedBy: req.auth.userId,
                isDeleted: false,
            },
            include: {
                updatedAt: false,
                createdAt: false,
                branchId: false,
                isDeleted: false,
                deletedAt: false,
                createdBy: false,
                updatedBy: false,
                deletedBy: false
            }
        });

        // Generate signed URL if image exists
        const signedImage = await generateSignedUrl(updatedMenu.image);

        // Return the updated menu
        return res.status(200).json({
            message: "Menu updated successfully",
            menu: {
                ...updatedMenu,
                days: updatedMenu.days.split(","), // Convert stored string to array in response
                image: signedImage  // Include the signed URL in response
            }
        });
    } catch (error) {
        // Catch any internal server errors
        return res.status(400).json({
            message: "Unable to update taste menu",
            error: error.message
        });
    }
};



// Delete Testing menu
/**
 * Deletes a taste menu with the given ID
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @returns {Promise<void>}
 */
const deletetasteMenu = async (req, res) => {
    try {

        if (req.auth.userId !== req.auth.sub &&
            !req.auth.permissions.includes("delete-dailyMenu")
        ) {
            // User is not authorized to delete the menu
            return res
                .status(401)
                .json({ message: "Unauthorized. You are not an admin" });
        }

        // Check if the menu exists
        const existingMenu = await prisma.tasteMenu.findFirst({
            where: {
                id: Number(req.params.id),
                branchId: req.auth.branchId,
                isDeleted: false,
            },
        });

        if (!existingMenu) {
            // Menu not found
            return res.status(400).json({ message: "Menu not found" });
        }

        // Delete the menu if it exists
        await prisma.tasteMenu.update({
            where: {
                id: Number(req.params.id),
                branchId: req.auth.branchId
            },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: req.auth.userId,

            },

        });

        // Return success message
        return res.status(200).json({ message: "Menu deleted successfully" });
    } catch (error) {
        // Catch any internal server errors
        return res.status(400).json({ error: error.message });
    }
};

module.exports = {
    addtasteMenu,
    getAlltasteMenus,
    getSingletasteMenu,
    updatetasteMenu,
    deletetasteMenu,
};


