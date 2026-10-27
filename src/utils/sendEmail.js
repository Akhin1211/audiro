const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to, otp, subject = "Audiro - Verification Code") => {
  const expiryMinutes = process.env.OTP_EXPIRES_IN_MINUTES || 5;

  await transporter.sendMail({
    from: `"Audiro" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: subject,
    text: `Your Audiro verification OTP is ${otp}. It is valid for ${expiryMinutes} minutes. Never share this code with anyone.`,
  });
};

module.exports = sendEmail;