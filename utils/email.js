const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  const mailOptions = {
    from: `"MySocial" <${process.env.EMAIL}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  // DEBUGGING
  await transporter.verify();
  console.log("SMTP verified!");

  // SEND OUT EMAIL
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
