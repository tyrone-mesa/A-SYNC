const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { sendMail } = require("./utils/mailer");

(async () => {
  const to = process.env.SMTP_USER;
  if (!to) {
    console.error("SMTP_USER is not configured.");
    process.exit(1);
  }

  const result = await sendMail({
    to,
    subject: "ASIATECH SMTP verification",
    html: "<p>This is a minimal SMTP delivery test from ASIATECH SYNC.</p>",
  });

  console.log(JSON.stringify(result, null, 2));
  if (result.sent === false) {
    process.exit(1);
  }
})();
