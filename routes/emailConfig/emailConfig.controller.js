const prisma = require("../../utils/prisma");

//config email
const createEmailConfig = async (req, res) => {
  if (req.query.query === "deletemany") {
    try {
      const deleteManyEmailConfig = await prisma.emailConfig.deleteMany({
        where: {
          id: {
            in: req.body,
          },
        },
      });
      return res.status(200).json(deleteManyEmailConfig);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  } else {
    try {
      const createEmailConfig = await prisma.emailConfig.create({
        data: {
          emailConfigName: req.body.emailConfigName,
          emailHost: req.body.emailHost,
          emailPort: parseInt(req.body.emailPort),
          emailUser: req.body.emailUser,
          emailPass: req.body.emailPass,
        },
      });
      return res.status(201).json(createEmailConfig);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
};

//get email config
const getEmailConfig = async (req, res) => {
  try {
    const emailConfig = await prisma.emailConfig.findMany({
      orderBy: {
        id: "asc",
      },
    });
    return res.status(200).json(emailConfig);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

//get single email config
const getSingleEmailConfig = async (req, res) => {
  try {
    const emailConfig = await prisma.emailConfig.findUnique({
      where: {
        id: parseInt(req.params.id),
      },
    });
    return res.status(200).json(emailConfig);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

//update email config
const updateEmailConfig = async (req, res) => {
  try {
    const updateEmailConfig = await prisma.emailConfig.update({
      where: {
        id: parseInt(req.params.id),
      },
      data: {
        emailHost: req.body.emailHost,
        emailPort: parseInt(req.body.emailPort),
        emailUser: req.body.emailUser,
        emailPass: req.body.emailPass,
      },
    });
    return res.status(200).json(updateEmailConfig);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

//delete email config
const deleteEmailConfig = async (req, res) => {
  try {
    const deleteEmailConfig = await prisma.emailConfig.delete({
      where: {
        id: parseInt(req.params.id),
      },
    });
    return res.status(200).json(deleteEmailConfig);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createEmailConfig,
  getEmailConfig,
  getSingleEmailConfig,
  updateEmailConfig,
  deleteEmailConfig,
};
