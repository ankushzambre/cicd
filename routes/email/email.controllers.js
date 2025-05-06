const { ToWords } = require("to-words");
const Email = require("../../utils/email");
const prisma = require("../../utils/prisma");

const sendEmail = async (req, res) => {
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

    //get the data from the request body
    const cc = req.body.cc ? req.body.cc : undefined;
    const bcc = req.body.bcc ? req.body.bcc : undefined;
    const email = await prisma.email.create({
      data: {
        cc: cc
          ? { create: cc.map((email) => ({ ccEmail: email })) }
          : undefined,
        bcc: bcc
          ? { create: bcc.map((email) => ({ bccEmail: email })) }
          : undefined,
        senderEmail: req.body.senderEmail,
        receiverEmail: req.body.receiverEmail,
        subject: req.body.subject,
        body: req.body.body,
        emailStatus: "sent",
      },
    });

    //update the email status
    const updateEmailStatus = async (status) => {
      await prisma.email.update({
        where: {
          id: email.id,
        },
        data: {
          emailStatus: status,
        },
      });
    };

    //send the email
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
        undefined,
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
    return res.status(400).json(error.message);
  }
};

//get all emails
const getAllEmails = async (req, res) => {
  try {
    const getAllEmails = await prisma.email.findMany({
      orderBy: {
        id: "asc",
      },
      include: {
        cc: true,
        bcc: true,
      },
    });
    return res.status(200).json(getAllEmails);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

//get single email
const getSingleEmail = async (req, res) => {
  try {
    const getSingleEmail = await prisma.email.findUnique({
      where: {
        id: parseInt(req.params.id),
      },
      include: {
        cc: true,
        bcc: true,
      },
    });
    return res.status(200).json(getSingleEmail);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

//delete email
const deleteEmail = async (req, res) => {
  try {
    const deleteEmail = await prisma.email.delete({
      where: {
        id: parseInt(req.params.id),
      },
    });
    if (deleteEmail) {
      return res.status(200).json({ message: "Email deleted successfully" });
    }
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = {
  sendEmail,
  getAllEmails,
  getSingleEmail,
  deleteEmail,
};
