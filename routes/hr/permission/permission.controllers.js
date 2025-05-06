const { getPagination } = require("../../../utils/query");
const prisma = require("../../../utils/prisma");

const getAllPermission = async (req, res) => {
  if (req.query.query === "all") {
    const allRole = await prisma.permission.findMany({
      orderBy: [
        {
          id: "asc",
        },
      ],
    });
    return res.status(200).json(allRole);
  } else {
    const { skip, limit } = getPagination(req.query);
    try {
      const allRole = await prisma.permission.findMany({
        orderBy: [
          {
            id: "asc",
          },
        ],
        skip: Number(skip),
        take: Number(limit),
      });
      return res.status(200).json(allRole);
    } catch (error) {
      return res.status(400).json(error.message);
    }
  }
};

module.exports = {
  getAllPermission,
};
