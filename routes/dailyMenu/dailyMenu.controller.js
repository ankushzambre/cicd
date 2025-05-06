const prisma = require("../../utils/prisma");

// //Add Daily Menu

/**
 * Controller to add a new daily menu or update an existing one.
 * @param {Request} req - The request object containing the daily menu details.
 * @param {Response} res - The response object to send the response back to the client.
 */
const addDailyMenu = async (req, res) => {
    try {
        if (!req.auth.permissions.includes("create-dailyMenu")) {
            return res.status(401).json({ message: "Unauthorized. You are not an admin" });
        }

        let { day, lunch, dinner, lunchPrice, dinnerPrice, menuIds } = req.body;

        if (!day) {
            return res.status(400).send({ message: "Day is required." });
        }
        if (!lunch && !dinner) {
            return res.status(400).send({ message: "Either lunch or dinner must be selected." });
        }
        if (!menuIds || !Array.isArray(menuIds) || menuIds.length === 0) {
            return res.status(400).send({ message: "At least one Menu ID is required." });
        }

        // Convert day to lowercase to ensure case-insensitive comparison
        day = day.toLowerCase();

        // Fetch all menu items to ensure they exist
        const existingMenus = await prisma.menu.findMany({
            where: {
                id: { in: menuIds },
                branchId: req.auth.branchId,
                isDeleted: false,
            },
        });

        if (existingMenus.length !== menuIds.length) {
            return res.status(404).send({ message: "One or more Menu IDs are invalid." });
        }

        // Check if a daily menu already exists for this day, branch, and type (lunch/dinner)
        const existingDailyMenu = await prisma.dailyMenu.findFirst({
            where: {
                day: { equals: day, mode: "insensitive" }, // Case-insensitive check
                branchId: req.auth.branchId,
                isDeleted: false,
                ...(lunch && { lunch: true }), // Check for existing lunch if adding lunch
                ...(dinner && { dinner: true }), // Check for existing dinner if adding dinner
            },
        });

        if (existingDailyMenu) {
            // Get existing daily menu details to avoid duplicate entries
            const existingMenuLinks = await prisma.dailyMenuDetail.findMany({
                where: {
                    dailyMenuId: existingDailyMenu.id,
                    menuId: { in: menuIds },
                },
                select: { menuId: true },
            });

            const existingMenuIds = new Set(existingMenuLinks.map((m) => m.menuId));
            const newMenuIds = menuIds.filter((id) => !existingMenuIds.has(id));

            if (newMenuIds.length === 0) {
                return res.status(400).send({ message: "All selected menus are already added to the daily menu." });
            }

            // Add new menu items to the existing daily menu
            await prisma.dailyMenuDetail.createMany({
                data: newMenuIds.map((menuId) => ({
                    dailyMenuId: existingDailyMenu.id,
                    menuId,
                })),
            });

            return res.status(200).send({ message: "Menus added to existing daily menu successfully." });
        } else {
            // Apply logic for lunch and dinner exclusivity
            if (lunch) {
                dinner = false;
                dinnerPrice = 0;
            } else if (dinner) {
                lunch = false;
                lunchPrice = 0;
            }

            // Create a new daily menu
            const newDailyMenu = await prisma.dailyMenu.create({
                data: {
                    day,
                    lunch,
                    dinner,
                    lunchPrice: lunch ? lunchPrice : 0,
                    dinnerPrice: dinner ? dinnerPrice : 0,
                    branch: {
                        connect: {
                            id: req.auth.branchId, // Ensure `branchId` comes from authenticated user
                        },
                    },
                },
                include: {
                    updatedAt: false,
                    deletedAt: false,
                    createdAt: false,
                    branchId: false,
                    isDeleted: false
                }
            });

            // Add menu items to the new daily menu
            await prisma.dailyMenuDetail.createMany({
                data: menuIds.map((menuId) => ({
                    dailyMenuId: newDailyMenu.id,
                    menuId,
                })),
            });

            // Fetch newly added menu items
            const menuDetails = await prisma.dailyMenuDetail.findMany({
                where: { dailyMenuId: newDailyMenu.id },
                include: {
                    menu: {  // Fetch only required fields from the menu
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
            });
            return res.status(201).send({
                message: "Daily menu created and menus added successfully.",
                dailyMenu: newDailyMenu,
                menus: menuDetails.map((m) => m.menu),
            });
        }
    } catch (error) {
        return res.status(400).send({ message: error.message });
    }
};

// Get all Daily menus
/**
 * Retrieves all daily menus that match the given filter conditions.
 * If `lunch` or `dinner` is provided, only daily menus that match
 * the specified value will be returned.
 * @param req Request object from Express
 * @param res Response object from Express
 */
const getAllDailyMenus = async (req, res) => {
    try {
        if (!req.auth.permissions.includes("readAll-dailyMenu")) {
            return res.status(401).json({ message: "Unauthorized. You are not an admin" });
        }

        const { lunch, dinner } = req.query;

        // Build dynamic filtering condition
        let filterConditions = {
            branchId: req.auth.branchId,
            isDeleted: false
        };

        if (lunch !== undefined) {
            filterConditions.lunch = lunch === "true";
        }

        if (dinner !== undefined) {
            filterConditions.dinner = dinner === "true";
        }

        // Fetch filtered daily menus
        const dailymenuList = await prisma.dailyMenu.findMany({
            where: filterConditions,
            orderBy: {
                id: "asc"
            },
            include: {
                createdAt: false,
                updatedAt: false,
                deletedAt: false,
                branchId: false,
                isDeleted: false,
                dailyMenuDetail: {  // Ensure this matches your Prisma schema
                    include: {
                        id: false,
                        dailyMenuId: false,
                        menuId: false,
                        menu: {  // Fetch only required fields from the menu
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });
        // Format response to include menus properly
        const formattedDailyMenus = dailymenuList.map(dailyMenu => ({
            ...dailyMenu,
            menus: dailyMenu.dailyMenuDetail.map(detail => detail.menu) // Extract menus from dailyMenuDetail
        }));

        return res.status(200).json({
            dailymenuList: formattedDailyMenus,
            menuListCount: formattedDailyMenus.length
        });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};


// Get single Daily menu record details
/**
 * Retrieves a single daily menu record by ID.
 * Checks user permissions before retrieving the record.
 * 
 * @param {Object} req - The request object containing parameters and authentication information.
 * @param {Object} res - The response object to send the response back to the client.
 */
const getSingleDailyMenu = async (req, res) => {
    try {
        // Check if user has permission to read a single daily menu
        if (!req.auth.permissions.includes("readSingle-dailyMenu")) {
            return res.status(401).json({ message: "Unauthorized. You are not an admin" });
        }

        // Fetch the daily menu record for the authenticated user's branch
        const getSingleDailyMenuRecord = await prisma.dailyMenu.findFirst({
            where: {
                id: parseInt(req.params.id), // Parse ID from request parameters
                branchId: req.auth.branchId, // Only allow access to records for the user's branch
                isDeleted: false // Exclude deleted records
            },
            include: {
                createdAt: false,
                updatedAt: false,
                deletedAt: false,
                branchId: false,
                isDeleted: false,
                dailyMenuDetail: { // Include related menu details
                    include: {
                        id: false,
                        dailyMenuId: false,
                        menuId: false,
                        menu: { // Fetch only required fields from the menu
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });

        // Return the daily menu record if found
        if (getSingleDailyMenuRecord) {
            return res.status(200).json(getSingleDailyMenuRecord);
        }

        // Return error if the daily menu record is not found
        return res.status(400).json({ message: " Daily Menu details not found." });
    } catch (error) {
        // Return error if an exception occurs
        return res.status(400).json({ error: error.message });
    }
};


// Update Daily menu details
/**
 * Updates a daily menu record with the given details.
 * @param req Request object from Express
 * @param res Response object from Express
 */
const updateDailyMenu = async (req, res) => {
    try {
        if (!req.auth.permissions.includes("update-dailyMenu")) {
            return res.status(401).json({ message: "Unauthorized. You are not an admin" });
        }

        const { day, lunch, dinner, lunchPrice, dinnerPrice, menuIds } = req.body;
        const dailyMenuId = parseInt(req.params.id);

        if (!day) {
            return res.status(400).send({ message: "Day is required." });
        }
        if (!lunch && !dinner) {
            return res.status(400).send({ message: "Either lunch or dinner must be selected." });
        }
        if (!menuIds || !Array.isArray(menuIds) || menuIds.length === 0) {
            return res.status(400).send({ message: "At least one Menu ID is required." });
        }

        // Convert day to lowercase for case-insensitive comparison
        const formattedDay = day.toLowerCase();

        // Fetch all menu items to ensure they exist
        const existingMenus = await prisma.menu.findMany({
            where: {
                id: { in: menuIds },
                branchId: req.auth.branchId,
                isDeleted: false,
            },
        });

        if (existingMenus.length !== menuIds.length) {
            return res.status(404).send({ message: "One or more Menu IDs are invalid." });
        }

        // Check if daily menu exists
        const existingMenu = await prisma.dailyMenu.findUnique({
            where: { id: dailyMenuId },
        });

        if (!existingMenu || existingMenu.isDeleted) {
            return res.status(404).send({ message: "Daily Menu not found." });
        }

        // Ensure no duplicate daily menus for the same day and type
        const duplicateMenu = await prisma.dailyMenu.findFirst({
            where: {
                day: { equals: formattedDay, mode: "insensitive" },
                branchId: req.auth.branchId,
                isDeleted: false,
                id: { not: dailyMenuId },
                ...(lunch && { lunch: true }),
                ...(dinner && { dinner: true }),
            },
        });

        if (duplicateMenu) {
            return res.status(400).send({ message: "A menu for this day already exists." });
        }

        // Apply logic for lunch and dinner exclusivity
        let updatedLunch = lunch;
        let updatedDinner = dinner;
        let updatedLunchPrice = lunch ? lunchPrice : 0;
        let updatedDinnerPrice = dinner ? dinnerPrice : 0;

        if (lunch) {
            updatedDinner = false;
            updatedDinnerPrice = 0;
        } else if (dinner) {
            updatedLunch = false;
            updatedLunchPrice = 0;
        }

        // Update the daily menu
        const updatedMenu = await prisma.dailyMenu.update({
            where: { id: dailyMenuId },
            data: {
                day: formattedDay,
                lunch: updatedLunch,
                dinner: updatedDinner,
                lunchPrice: updatedLunchPrice,
                dinnerPrice: updatedDinnerPrice,
            },
        });

        // Fetch existing menu details
        const existingMenuLinks = await prisma.dailyMenuDetail.findMany({
            where: { dailyMenuId },
            select: { menuId: true },
        });

        const existingMenuIds = new Set(existingMenuLinks.map((m) => m.menuId));
        const newMenuIds = menuIds.filter((id) => !existingMenuIds.has(id));
        const removedMenuIds = existingMenuLinks.map((m) => m.menuId).filter((id) => !menuIds.includes(id));

        // Remove old menu links
        if (removedMenuIds.length > 0) {
            await prisma.dailyMenuDetail.deleteMany({
                where: {
                    dailyMenuId,
                    menuId: { in: removedMenuIds },
                },
            });
        }

        // Add new menu items
        if (newMenuIds.length > 0) {
            await prisma.dailyMenuDetail.createMany({
                data: newMenuIds.map((menuId) => ({
                    dailyMenuId,
                    menuId,
                })),
            });
        }
        const updatedMenuWithDetails = await prisma.dailyMenu.findUnique({
            where: { id: dailyMenuId },
            include: {
                dailyMenuDetail: {  // Ensure this matches your Prisma schema
                    include: {
                        id: false,
                        dailyMenuId: false,
                        menuId: false,
                        menu: {  // Fetch only required fields from the menu
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
        });
        return res.status(200).send({
            message: "Daily menu updated successfully",
            updatedMenu: updatedMenuWithDetails
        });
    } catch (error) {
        return res.status(400).send({ message: error.message });
    }
};



/**
 * Deletes a daily menu by ID.
 * This function checks user permissions before proceeding with the deletion.
 *
 * @param {Object} req - The request object containing parameters and authentication information.
 * @param {Object} res - The response object to send the response back to the client.
 */
const deleteDailyMenu = async (req, res) => {
    try {
        // Check if the user has permission to delete a daily menu
        if (!req.auth.permissions.includes("delete-dailyMenu")) {
            return res.status(401).json({ message: "Unauthorized. You are not an admin" });
        }

        // Check if the daily menu exists for the given ID and branch
        const existingDailyMenu = await prisma.dailyMenu.findFirst({
            where: {
                id: Number(req.params.id),
                branchId: req.auth.branchId,
                isDeleted: false,
            },
        });

        // If the daily menu does not exist, return an error
        if (!existingDailyMenu) {
            return res.status(400).json({ message: "Daily Menu not found" });
        }

        // Perform a soft delete on the daily menu
        await prisma.dailyMenu.update({
            where: { id: Number(req.params.id) },
            data: {
                isDeleted: true,
                deletedAt: new Date()
            }
        });

        // Return a success message if the daily menu is deleted
        return res.status(200).json({ message: "Daily Menu deleted successfully" });
    } catch (error) {
        // Catch any errors and return a 400 status
        return res.status(400).json({ error: error.message });
    }
};


module.exports = {
    addDailyMenu,
    getAllDailyMenus,
    getSingleDailyMenu,
    updateDailyMenu,
    deleteDailyMenu,
};