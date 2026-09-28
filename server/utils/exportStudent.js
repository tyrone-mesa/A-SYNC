const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

function buildResumePdf({ profile, user }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      info: { Title: `${user.fullName} Profile` },
    });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const left = 54;
    const right = pageWidth - 54;
    const contentWidth = right - left;
    const forest = "#214C3F";
    const green = "#79B791";
    const paleGreen = "#EAF3EE";
    const ink = "#18263A";
    const muted = "#667085";
    const gold = "#D8B86A";

    const polygon = (points, color, opacity = 1) => {
      doc.save();
      doc.opacity(opacity);
      doc.moveTo(points[0][0], points[0][1]);
      points.slice(1).forEach(([x, y]) => doc.lineTo(x, y));
      doc.closePath().fill(color);
      doc.restore();
    };

    doc.rect(0, 0, pageWidth, pageHeight).fill("#FBFDFC");
    doc.rect(0, 0, pageWidth, 166).fill(forest);
    polygon(
      [
        [pageWidth - 190, 0],
        [pageWidth, 0],
        [pageWidth, 132],
        [pageWidth - 72, 78],
      ],
      "#2D6D59",
    );
    polygon(
      [
        [pageWidth - 96, 0],
        [pageWidth, 0],
        [pageWidth, 72],
      ],
      "#3D8068",
    );
    polygon(
      [
        [0, 166],
        [pageWidth, 166],
        [pageWidth, 170],
        [0, 170],
      ],
      gold,
    );
    polygon(
      [
        [0, 170],
        [130, 170],
        [0, 300],
      ],
      "#E8F3EC",
      0.72,
    );
    polygon(
      [
        [pageWidth, 170],
        [pageWidth, 310],
        [pageWidth - 130, 170],
      ],
      "#E8F3EC",
      0.68,
    );
    polygon(
      [
        [0, pageHeight],
        [0, pageHeight - 170],
        [170, pageHeight],
        [pageWidth, pageHeight - 80],
        [pageWidth, pageHeight],
      ],
      "#EDF6F0",
      0.8,
    );
    polygon(
      [
        [pageWidth - 130, pageHeight],
        [pageWidth, pageHeight - 130],
        [pageWidth, pageHeight],
      ],
      "#DCEFE3",
      0.8,
    );
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#FFFFFF")
      .text("ASIATECH SYNC", left, 35, {
        characterSpacing: 1.2,
      });
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#B8DCC5")
      .text("STUDENT PROFILE", right - 106, 37, {
        width: 106,
        align: "right",
        characterSpacing: 0.8,
      });
    doc
      .moveTo(left, 57)
      .lineTo(right, 57)
      .lineWidth(1)
      .strokeColor("#6FA68A")
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(25)
      .fillColor("#FFFFFF")
      .text(user.fullName, left, 76, { width: contentWidth });
    doc
      .font("Helvetica")
      .fontSize(13)
      .fillColor("#DCEDE2")
      .text(
        `${profile.course || "Student"}${profile.yearLevel ? `  ·  ${profile.yearLevel}` : ""}`,
        left,
        111,
        { width: contentWidth },
      );
    doc
      .fontSize(9)
      .fillColor("#C9E1D1")
      .text(
        [user.email, profile.phone, profile.address]
          .filter(Boolean)
          .join("  ·  "),
        left,
        137,
        { width: contentWidth, ellipsis: true },
      );

    const section = (title, y) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .fillColor(ink)
        .text(title, left, y);
      doc
        .moveTo(left, y + 23)
        .lineTo(right, y + 23)
        .lineWidth(1)
        .strokeColor("#D8E6DE")
        .stroke();
      doc
        .moveTo(left, y + 23)
        .lineTo(left + 52, y + 23)
        .lineWidth(2)
        .strokeColor(green)
        .stroke();
    };
    const field = (label, value, x, y, width) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(muted)
        .text(label.toUpperCase(), x, y);
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor(ink)
        .text(value || "Not provided", x, y + 13, { width, ellipsis: true });
    };

    section("PERSONAL INFORMATION", 202);
    field("Program", profile.course, left, 240, 220);
    field("Year Level", profile.yearLevel, 318, 240, 220);
    field("Department", profile.department, left, 286, 220);
    field("Email", user.email, 318, 286, 220);

    section("CAREER OBJECTIVE", 360);
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(ink)
      .text(profile.bio || "No career objective provided.", left, 398, {
        width: contentWidth,
        height: 58,
        lineGap: 4,
        ellipsis: true,
      });

    section("TECHNICAL SKILLS", 492);
    const skills = profile.skills?.length
      ? profile.skills
      : ["No skills listed"];
    let skillX = left;
    let skillY = 530;
    skills.slice(0, 10).forEach((skill) => {
      const width = Math.min(
        150,
        Math.max(
          58,
          doc.widthOfString(skill, { font: "Helvetica-Bold", size: 10 }) + 28,
        ),
      );
      if (skillX + width > right) {
        skillX = left;
        skillY += 34;
      }
      doc.roundedRect(skillX, skillY, width, 25, 12).fill(paleGreen);
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(forest)
        .text(skill, skillX, skillY + 8, { width, align: "center" });
      skillX += width + 10;
    });

    doc.roundedRect(left, skillY + 78, contentWidth, 58, 12).fill("#F1F7F3");
    doc.rect(left, skillY + 78, 5, 58).fill(green);
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(forest)
      .text("Ready for opportunity", left + 20, skillY + 91);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(muted)
      .text(
        "A concise profile prepared through ASIATECH SYNC.",
        left + 20,
        skillY + 111,
      );

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#94A39A")
      .text(
        `Generated by ASIATECH SYNC  ·  ${new Date().toLocaleDateString()}`,
        left,
        pageHeight - 42,
        { width: contentWidth, align: "center" },
      );

    doc.end();
  });
}

const PROFILE_ROWS = ({ profile, user }) => [
  ["Full Name", user.fullName],
  ["Email", user.email],
  ["Phone", profile.phone || ""],
  ["Address", profile.address || ""],
  ["Course", profile.course || ""],
  ["Year Level", profile.yearLevel || ""],
  ["Department", profile.department || ""],
  ["Completed OJT Hours", profile.completedOJTHours || 0],
  ["Required OJT Hours", profile.requiredOJTHours || 0],
  ["Skills", (profile.skills || []).join("; ")],
  ["Bio", profile.bio || ""],
];

async function buildResumeXlsx(data) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Profile");
  sheet.columns = [
    { header: "Field", key: "field", width: 22 },
    { header: "Value", key: "value", width: 60 },
  ];
  PROFILE_ROWS(data).forEach(([field, value]) =>
    sheet.addRow({ field, value }),
  );
  sheet.getRow(1).font = { bold: true };
  return workbook.xlsx.writeBuffer();
}

// Hand-rolled rather than a dependency — a single-record export doesn't need a full CSV
// library, just correct quoting for values that contain commas, quotes, or newlines.
function csvEscape(value) {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function buildResumeCsv(data) {
  const rows = PROFILE_ROWS(data);
  const header = rows.map(([field]) => csvEscape(field)).join(",");
  const values = rows.map(([, value]) => csvEscape(value)).join(",");
  return `${header}\n${values}\n`;
}

module.exports = { buildResumePdf, buildResumeXlsx, buildResumeCsv };
