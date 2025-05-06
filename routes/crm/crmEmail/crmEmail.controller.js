const prisma = require("../../../utils/prisma");
const Email = require("../../../utils/email");
const { getPagination } = require("../../../utils/query");
//create a crmEmail
const createCrmEmail = async (req, res) => {
  if (req.query.query === "deletemany") {
    try {
      const deleteManyCrmEmail = await prisma.crmEmail.deleteMany({
        where: {
          id: {
            in: req.body,
          },
        },
      });
      return res.status(200).json(deleteManyCrmEmail);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  } else {
    try {
      //get the email config from database
      const emailConfig = await prisma.emailConfig.findFirst({
        where: {
          AND: {
            emailConfigName: req.params.emailConfigName,
          },
        },
      });

      if (!emailConfig.emailConfigName === req.params.emailConfigName) {
        return res.status(400).json({ message: "Email config not found" });
      }
      const cc = req.body.cc ? req.body.cc : undefined;
      const bcc = req.body.bcc ? req.body.bcc : undefined;
      const crmEmail = await prisma.crmEmail.create({
        data: {
          emailOwner: {
            connect: {
              id: parseInt(req.body.emailOwnerId),
            },
          },
          contact: req.body.contactId
            ? {
                connect: {
                  id: req.body.contactId,
                },
              }
            : undefined,
          company: req.body.companyId
            ? {
                connect: {
                  id: req.body.companyId,
                },
              }
            : undefined,
          opportunity: req.body.opportunityId
            ? {
                connect: {
                  id: req.body.opportunityId,
                },
              }
            : undefined,
          quote: req.body.quoteId
            ? {
                connect: {
                  id: req.body.quoteId,
                },
              }
            : undefined,
          cc: cc
            ? {
                create: cc.map((email) => ({
                  ccEmail: email,
                })),
              }
            : undefined,
          bcc: bcc
            ? {
                create: bcc.map((email) => ({ bccEmail: email })),
              }
            : undefined,
          senderEmail: emailConfig[0].emailUser,
          receiverEmail: req.body.receiverEmail,
          subject: req.body.subject,
          body: req.body.body,
          emailStatus: "sent",
        },
      });

      //update the email status
      const updateEmailStatus = async (status) => {
        await prisma.crmEmail.update({
          where: {
            id: crmEmail.id,
          },
          data: {
            emailStatus: status,
          },
        });
      };

      if (!cc && !bcc) {
        const mail = await Email.email(
          emailConfig,
          req.body.receiverEmail,
          req.body.subject,
          req.body.body
        );

        if (mail) {
          updateEmailStatus("sent");
        } else {
          updateEmailStatus("failed");
        }
        return res.status(200).json({ message: "Mail sent Successfully" });
      } else if (cc && !bcc) {
        const mail = await Email.email(
          emailConfig,
          req.body.receiverEmail,
          req.body.subject,
          req.body.body,
          cc
        );
        if (mail) {
          updateEmailStatus("sent");
        } else {
          updateEmailStatus("failed");
        }
        return res.status(200).json({ message: "Mail sent Successfully" });
      } else if (bcc && !cc) {
        const mail = await Email.email(
          emailConfig,
          req.body.receiverEmail,
          req.body.subject,
          req.body.body,
          null,
          bcc
        );
        if (mail) {
          updateEmailStatus("sent");
        } else {
          updateEmailStatus("failed");
        }
        return res.status(200).json({ message: "Mail sent Successfully" });
      } else {
        const mail = await Email.email(
          emailConfig,
          req.body.receiverEmail,
          req.body.subject,
          req.body.body,
          cc,
          bcc
        );
        if (mail) {
          updateEmailStatus("sent");
        } else {
          updateEmailStatus("failed");
        }
        return res.status(200).json({ message: "Mail sent Successfully" });
      }
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
};

//get all crmEmails
const getAllCrmEmails = async (req, res) => {
  if (req.query.query === "all") {
    try {
      const getAllCrmEmail = await prisma.crmEmail.findMany({
        orderBy: {
          id: "desc",
        },
        include: {
          emailOwner: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          cc: true,
          bcc: true,
        },
      });

      getAllCrmEmail.map((email) => {
        email.emailOwner.fullName =
          email.emailOwner.firstName + " " + email.emailOwner.lastName;
      });

      return res.status(200).json(getAllCrmEmail);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  } else if (req.query.query === "search") {
    try {
      const { skip, limit } = getPagination(req.query);
      const getAllCrmEmail = await prisma.crmEmail.findMany({
        orderBy: {
          id: "desc",
        },
        where: {
          OR: [
            {
              subject: {
                contains: req.query.key,
                mode: "insensitive",
              },
            },
            {
              senderEmail: {
                contains: req.query.key,
                mode: "insensitive",
              },
            },
            {
              receiverEmail: {
                contains: req.query.key,
                mode: "insensitive",
              },
            },
            {
              emailStatus: {
                contains: req.query.key,
                mode: "insensitive",
              },
            },
          ],
        },
        include: {
          emailOwner: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          cc: true,
          bcc: true,
          company: true,
          contact: true,
          opportunity: true,
          quote: true,
        },
        skip: Number(skip),
        take: Number(limit),
      });

      getAllCrmEmail.map((crmEmail) => {
        crmEmail.emailOwner.fullName =
          crmEmail.emailOwner.firstName + " " + crmEmail.emailOwner.lastName;
      });

      const totalCrmEmailCount = {
        _count: {
          id: getAllCrmEmail.length,
        },
      };
      return res.status(200).json({ getAllCrmEmail, totalCrmEmailCount });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  } else if (req.query) {
    //get the boolean status
    const boolenStatus = req.query.status?.split(",").map(JSON.parse);

    //get all company with pagination
    if (boolenStatus.length === 2) {
      try {
        const { skip, limit } = getPagination(req.query);
        const getAllCrmEmail = await prisma.crmEmail.findMany({
          orderBy: {
            id: "desc",
          },
          where: {
            companyId: {
              in: req.query.company?.split(",").map(Number)
                ? req.query.company?.split(",").map(Number)
                : undefined,
            },
            contactId: {
              in: req.query.contact?.split(",").map(Number)
                ? req.query.contact?.split(",").map(Number)
                : undefined,
            },
            opportunityId: {
              in: req.query.opportunity?.split(",").map(Number)
                ? req.query.opportunity?.split(",").map(Number)
                : undefined,
            },
            quoteId: {
              in: req.query.quote?.split(",").map(Number)
                ? req.query.quote?.split(",").map(Number)
                : undefined,
            },
            OR: [
              { status: { equals: boolenStatus[0] } },
              { status: { equals: boolenStatus[1] } },
            ],
          },
          include: {
            emailOwner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            cc: true,
            bcc: true,
            company: {
              select: {
                id: true,
                companyName: true,
              },
            },
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            opportunity: {
              select: {
                id: true,
                opportunityName: true,
              },
            },
            quote: {
              select: {
                id: true,
                quoteName: true,
              },
            },
          },
          skip: Number(skip),
          take: Number(limit),
        });

        const totalNoteCount = await prisma.crmEmail.aggregate({
          where: {
            companyId: {
              in: req.query.company?.split(",").map(Number)
                ? req.query.company?.split(",").map(Number)
                : undefined,
            },
            contactId: {
              in: req.query.contact?.split(",").map(Number)
                ? req.query.contact?.split(",").map(Number)
                : undefined,
            },
            opportunityId: {
              in: req.query.opportunity?.split(",").map(Number)
                ? req.query.opportunity?.split(",").map(Number)
                : undefined,
            },
            quoteId: {
              in: req.query.quote?.split(",").map(Number)
                ? req.query.quote?.split(",").map(Number)
                : undefined,
            },
            OR: [
              { status: { equals: boolenStatus[0] } },
              { status: { equals: boolenStatus[1] } },
            ],
          },
          _count: {
            id: true,
          },
        });

        getAllCrmEmail.map((crmEmail) => {
          crmEmail.emailOwner.fullName =
            crmEmail.emailOwner.firstName + " " + crmEmail.emailOwner.lastName;
        });

        return res.status(200).json({
          getAllCrmEmail,
          totalNoteCount,
        });
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }
    } else if (boolenStatus.length === 1) {
      try {
        const { skip, limit } = getPagination(req.query);
        const getAllCrmEmail = await prisma.crmEmail.findMany({
          orderBy: {
            id: "desc",
          },
          where: {
            companyId: {
              in: req.query.company?.split(",").map(Number)
                ? req.query.company?.split(",").map(Number)
                : undefined,
            },
            contactId: {
              in: req.query.contact?.split(",").map(Number)
                ? req.query.contact?.split(",").map(Number)
                : undefined,
            },
            opportunityId: {
              in: req.query.opportunity?.split(",").map(Number)
                ? req.query.opportunity?.split(",").map(Number)
                : undefined,
            },
            quoteId: {
              in: req.query.quote?.split(",").map(Number)
                ? req.query.quote?.split(",").map(Number)
                : undefined,
            },
            OR: [
              { status: { equals: boolenStatus[0] } },
              { status: { equals: boolenStatus[1] } },
            ],
          },
          include: {
            emailOwner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            cc: true,
            bcc: true,
            company: {
              select: {
                id: true,
                companyName: true,
              },
            },
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            opportunity: {
              select: {
                id: true,
                opportunityName: true,
              },
            },
            quote: {
              select: {
                id: true,
                quoteName: true,
              },
            },
          },
          skip: Number(skip),
          take: Number(limit),
        });
        const totalCrmEmailCount = await prisma.crmEmail.aggregate({
          where: {
            companyId: {
              in: req.query.company?.split(",").map(Number)
                ? req.query.company?.split(",").map(Number)
                : undefined,
            },
            contactId: {
              in: req.query.contact?.split(",").map(Number)
                ? req.query.contact?.split(",").map(Number)
                : undefined,
            },
            opportunityId: {
              in: req.query.opportunity?.split(",").map(Number)
                ? req.query.opportunity?.split(",").map(Number)
                : undefined,
            },
            quoteId: {
              in: req.query.quote?.split(",").map(Number)
                ? req.query.quote?.split(",").map(Number)
                : undefined,
            },
            OR: [
              { status: { equals: boolenStatus[0] } },
              { status: { equals: boolenStatus[1] } },
            ],
          },
          _count: {
            id: true,
          },
        });

        getAllCrmEmail.map((crmEmail) => {
          crmEmail.emailOwner.fullName =
            crmEmail.emailOwner.firstName + " " + crmEmail.emailOwner.lastName;
        });

        return res.status(200).json({
          getAllCrmEmail,
          totalCrmEmailCount,
        });
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }
    }
  }
};

//get single crmEmail
const getSingleCrmEmail = async (req, res) => {
  try {
    const getSingleCrmEmail = await prisma.crmEmail.findUnique({
      where: {
        id: parseInt(req.params.id),
      },
      include: {
        cc: true,
        bcc: true,
        company: true,
        contact: true,
        opportunity: true,
        quote: true,
      },
    });
    return res.status(200).json(getSingleCrmEmail);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
//delete crmEmail
const deleteCrmEmail = async (req, res) => {
  try {
    const deleteCrmEmail = await prisma.crmEmail.delete({
      where: {
        id: parseInt(req.params.id),
      },
    });
    if (deleteCrmEmail) {
      return res.status(200).json({ message: "CrmEmail deleted successfully" });
    }
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createCrmEmail,
  getAllCrmEmails,
  getSingleCrmEmail,
  deleteCrmEmail,
};
