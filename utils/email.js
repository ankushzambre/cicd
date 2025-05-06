const nodemailer = require("nodemailer");
require("dotenv").config();
// async..await is not allowed in global scope, must use a wrapper
async function email(receiverEmail, subject, text, cc, bcc) { 
  try {
    
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: process.env.EMAIL_USER, // sender address
      to: receiverEmail,
      cc: cc,
      bcc: bcc,
      subject: subject, // Subject line
      html: text,
    });
    return (message = { "Message sent: %s": info.messageId });
  } catch (error) {
    return (message = { error: error.message });
  }
}
module.exports = {
  email,
};
