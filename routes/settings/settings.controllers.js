const prisma = require("../../utils/prisma");

// Create Setting API
const addSetting = async (req, res) => {
  try {
    // Check permissions
    if (!req.auth.permissions.includes("create-settings")) {
      return res
        .status(401)
        .json({ message: "Unauthorized. You are not allowed to create settings" });
    }

    // Get setting data from request body
    const { settingkey, settingName, settingValue, status = true } = req.body;

    // Validate required fields
    if (!settingkey || !settingName) {
      return res
        .status(400)
        .json({ message: "settingkey and settingName are required" });
    }

    // Create new setting
    const newSetting = await prisma.settings.create({
      data: {
        settingkey,
        settingName,
        settingValue,
        status,
        branchId: req.auth.branchId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
       include: {
          createdAt: false,
          updatedAt: false,
          branchId: false,
          isDeleted: false,
        },
    });

    return res.status(201).json({
      message: "Setting created successfully",
      setting: newSetting,
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
};

const updateSetting = async (req, res) => {
  try {
    // Check permissions
    if (!req.auth.permissions.includes("update-settings")) {
      return res
        .status(401)
        .json({ message: "Unauthorized. You are not an admin" });
    }

    // Expecting req.body to be an array of settings to update
    const settingsToUpdate = req.body;

    // Validate that we received an array
    if (!Array.isArray(settingsToUpdate)) {
      return res
        .status(400)
        .json({ message: "Request body must be an array of settings" });
    }

    // Use a transaction to update all settings atomically
    const updatePromises = settingsToUpdate.map(setting => {
      // Validate required fields
      if (!setting.settingkey || !setting.settingName || !setting.id) {
        throw new Error("settingkey, setting Id and  settingName  are required for each setting");
      }

      return prisma.settings.update({
        where: {
          // Use individual fields instead of a composite key name
          branchId: req.auth.branchId,
          id: setting.id,  // Use the unique id field
          settingkey: setting.settingkey,
          settingName: setting.settingName
        },
        data: {
          settingValue: setting.settingValue,
          status: setting.status,
          updatedAt: new Date()
        },
         include: {
          createdAt: false,
          updatedAt: false,
          branchId: false,
          isDeleted: false,
        },
      });
    });

    // Execute all updates in a transaction
    const updatedSettings = await prisma.$transaction(updatePromises);

    return res.status(200).json({
      message: "Settings updated successfully",
      updatedSettings
    });

  } catch (error) {
    return res.status(400).json({ 
      message: "Error updating settings",
      error: error.message 
    });
  } 
};

const getSetting = async (req, res) => {
  try {
    if (
            !req.auth.permissions.includes("readAll-settings")
        ) {
            return res
                .status(401)
                .json({ message: "Unauthorized. You are not an admin" });
        }
    const newSetting = await prisma.settings.findMany({
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
            isDeleted: false,
          },
            
    });
    return res.status(200).json(newSetting);
  } catch (error) {
    return res.status(400).json(error.message);
  }
};

// Soft Delete Setting API
const deleteSetting = async (req, res) => {
  try {
    // Check permissions
    if (!req.auth.permissions.includes("delete-settings")) {
      return res
        .status(401)
        .json({ message: "Unauthorized. You are not allowed to delete settings" });
    }

    // Get setting ID from request parameters
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Setting ID is required" });
    }

    // Check if setting exists and belongs to the branch
    const setting = await prisma.settings.findFirst({
      where: {
        id: parseInt(id),
        branchId: req.auth.branchId,
        isDeleted: false
      },
    });

    if (!setting) {
      return res.status(404).json({ message: "Setting not found" });
    }

    // Perform soft delete
    const deletedSetting = await prisma.settings.update({
      where: {
        id: parseInt(id),
        branchId: req.auth.branchId,
      },
      data: {
        isDeleted: true,
      },
       include: {
          createdAt: false,
          updatedAt: false,
          branchId: false,
          isDeleted: false,
        },
    });

    return res.status(200).json({
      message: "Setting deleted successfully",
      setting: deletedSetting,
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
};


module.exports = {
  addSetting,
  updateSetting,
  getSetting,
  deleteSetting
};
