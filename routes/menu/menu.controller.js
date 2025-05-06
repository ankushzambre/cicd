const prisma = require("../../utils/prisma");
const { uploadToS3 } = require("../../utils/upload");


//Add Menu
const addMenu = async (req, res) => {
    try {
        if (
            !req.auth.permissions.includes("create-menu")
        ) {
            return res
                .status(401)
                .json({ message: "Unauthorized. You are not an admin" });
        }
        let data = req.body;
        if (!data.name) {
            return res.status(400).send({ message: "Name is required." });
        }
        if (!data.description) {
            return res.status(400).send({ message: "Description is required." });
        }
        if (!data.menuSliderHeader) {
            return res.status(400).send({ message: "Menu Slider Header is required)." });
        }
        let menuFound = await prisma.menu.findMany({
            where: {
                name: req.body.name,
                branchId: req.auth.branchId,
                isDeleted: false,
            },
        });


        // Upload Image to S3 if provided
        let mennuImageUrl = null;
        if (req.file) {
            mennuImageUrl = await uploadToS3(req.file);
        }

        if (menuFound.length > 0) {
            return res.status(400).send({ message: "Menu is already exist for the same name.", menuFound });
        } else {


            const createMenuResult = await prisma.menu.create({
                data: {
                    "name": req.body.name,
                    "description": req.body.description,
                    "menuSliderHeader": req.body.menuSliderHeader,
                    "menuImage": mennuImageUrl,
                    "branchId": req.auth.branchId,
                    "menuType": req.body.menuType,
                },
                include: {
                    createdAt: false,
                    updatedAt: false,
                    deletedAt: false,
                    branchId: false,
                    isDeleted: false,
                },
            });
            return res.status(201).send({ message: "Menu added successfully", createMenuResult });
        }
    } catch (error) {
        return res.status(400).send({ message: error.message });
    }
};

// Get all menu list
const getAllMenus = async (req, res) => {
    try {
        if (
            !req.auth.permissions.includes("readAll-menu")
        ) {
            return res
                .status(401)
                .json({ message: "Unauthorized. You are not an admin" });
        }
        const menuList = await prisma.menu.findMany({
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
            },
        });

        const response = {
            menuList: menuList,
            menuListCount: menuList.length
        };
        return res.status(200).json(response);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};

// Get single menu record details
const getSingleMenu = async (req, res) => {
    try {
        if (
            !req.auth.permissions.includes("readSingle-menu")
        ) {
            return res
                .status(401)
                .json({ message: "Unauthorized. You are not an admin" });
        }
        const getSingleMenuRecord = await prisma.menu.findFirst({
            where: {
                id: parseInt(req.params.id),
                branchId: req.auth.branchId,
                isDeleted: false
            },
            include: {
                createdAt: false,
                updatedAt: false,
                deletedAt: false,
                branchId: false,
                isDeleted: false,
            },
        });
        if (getSingleMenuRecord) {
            return res.status(200).json(getSingleMenuRecord);
        }
        return res.status(400).json({ message: "Menu details not found." });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};

// Update menu details
const updateMenu = async (req, res) => {
    try {
        if (
            !req.auth.permissions.includes("update-menu")
        ) {
            return res
                .status(401)
                .json({ message: "Unauthorized. You are not an admin" });
        }
        if (!req.body.name) {
            return res.status(400).send({ message: "Name is required." });
        }
        

        const menuAlreadyExist = await prisma.menu.findMany({
            where: {
                id: parseInt(req.params.id),
                branchId: req.auth.branchId,
                isDeleted: false
            }
        });

        if (menuAlreadyExist.length == 0) {
            return res.status(400).send({ message: "Menu record not found" });
        } else {
            let menuFound = await prisma.menu.findMany({
                where: {
                    name: req.body.name,
                    isDeleted: false,
                    NOT: {
                        id: parseInt(req.params.id),
                    }
                },
            });
            // Upload Image to S3 if provided
            let menuImageUrl = req.body.menuImage;
            if (req.file) {
                menuImageUrl = await uploadToS3(req.file);
            }

            if (menuFound.length > 0) {
                return res.status(400).send({ message: "Menu is already exist for the same name.", tableFound });
            } else {
                const createMenuResult = await prisma.menu.update({
                    where: {
                        id: parseInt(req.params.id),
                    },
                    data: {
                        "name": req.body.name,
                        "description": req.body.description,
                        "menuSliderHeader": req.body.menuSliderHeader,
                        "menuImage": menuImageUrl,
                        "branchId": req.auth.branchId,
                        "menuType": req.body.menuType,
                    },
                    include: {
                        createdAt: false,
                        updatedAt: false,
                        deletedAt: false,
                        branchId: false,
                        isDeleted: false,
                    },
                });
                return res.status(201).send({ message: "Menu updated successfully", createMenuResult });
            }
        }
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};

// Delete menu
const deleteMenu = async (req, res) => {
    try {

        if (
            !req.auth.permissions.includes("delete-menu")
        ) {
            return res
                .status(401)
                .json({ message: "Unauthorized. You are not an admin" });
        }

        // Check if the menu exists
        const existingMenu = await prisma.menu.findFirst({
            where: {
                id: Number(req.params.id),
                branchId: req.auth.branchId,
                isDeleted: false,
            },
        });

        if (!existingMenu) {
            return res.status(400).json({ message: "Menu not found" });
        }
        // Delete all related entries in dailyMenuDetail
        await prisma.dailyMenuDetail.deleteMany({
            where: { menuId: Number(req.params.id) },
        });
        // Delete the menu if it exists
        await prisma.menu.update({
            where: {
                id: Number(req.params.id),
                branchId: req.auth.branchId
            },
            data: {
                isDeleted: true,
                deletedAt: new Date()
            },
            include: {
                createdAt: false,
                updatedAt: false,
                deletedAt: false,
                branchId: false,
                isDeleted: false,
            },
        });

        return res.status(200).json({ message: "Menu deleted successfully" });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};


module.exports = {
    addMenu,
    getAllMenus,
    getSingleMenu,
    updateMenu,
    deleteMenu,
};