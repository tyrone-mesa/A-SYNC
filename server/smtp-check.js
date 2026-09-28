const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const nodemailer = require("nodemailer");

const host = process.env.SMTP_HOST || "smtp.gmail.com";
const port = Number(process.env.SMTP_PORT) || 465;
const user = process.env.SMTP_USER;
const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");

console.log("SMTP host:", host);
console.log("SMTP port:", port);
console.log("SMTP user set:", !!user);
console.log("SMTP pass set:", !!pass);

if (!user || !pass) {
  console.error("Missing SMTP credentials");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  auth: { user, pass },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP verify failed:");
    console.error(error && error.message ? error.message : String(error));
    process.exit(1);
  }

  console.log("SMTP verification succeeded:", success ? "yes" : "no");
  process.exit(0);
});
