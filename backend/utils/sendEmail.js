const nodemailer = require("nodemailer");

/**
 * Sends an email using nodemailer transport
 * @param {Object} options - { email: 'recipient', subject: 'subject', html: 'body' }
 */
const sendEmail = async (options) => {
  let transporter;

  // Use configured SMTP settings or create a test Ethereal account automatically
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Generate Ethereal Email credentials for mock/development usage
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    // Logging mock account link to access recovery emails in console/logs
    console.log("-----------------------------------------");
    console.log(" Nodemailer: SMTP not configured in .env");
    console.log(" Created Ethereal Test Account:");
    console.log(` User: ${testAccount.user}`);
    console.log(` Pass: ${testAccount.pass}`);
    console.log("-----------------------------------------");
  }

  const mailOptions = {
    from: `"${process.env.FROM_NAME || "ApplyAI Support"}" <${process.env.FROM_EMAIL || "noreply@applyai.com"}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  const info = await transporter.sendMail(mailOptions);

  if (!process.env.SMTP_USER) {
    console.log(` Recovery email sent successfully!`);
    console.log(` Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    console.log("-----------------------------------------");
  }
};

module.exports = sendEmail;
