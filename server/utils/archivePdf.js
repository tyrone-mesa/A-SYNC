const PDFDocument = require("pdfkit");

const SECTIONS = [
  ["Student profile", "studentProfile"],
  ["Company profile", "companyProfile"],
  ["Applications", "applications"],
  ["Attendance records", "attendance"],
  ["Job postings", "jobs"],
  ["Conversations", "conversations"],
  ["Messages", "messages"],
];

const PAGE = {
  left: 50,
  right: 545,
  top: 104,
  bottom: 770,
  rowGap: 8,
};

const INTERNAL_FIELDS = new Set([
  "_id",
  "__v",
  "id",
  "sourceMessage",
]);

const readableLabel = (key) =>
  key
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const formatValue = (value, key = "", depth = 0) => {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (
    value instanceof Date ||
    (typeof value === "string" &&
      (/(At|Date|Time|Deadline|Expires)$/i.test(key) ||
        /^time(in|out)$/i.test(key)) &&
      /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value))
  ) {
    return formatDate(value);
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (typeof value?.toHexString === "function") return "";

  if (Array.isArray(value)) {
    return value
      .map((item) => formatValue(item, key, depth + 1))
      .filter((item) => item && item !== "Not provided")
      .join(", ") || "Not provided";
  }

  if (typeof value === "object" && depth < 3) return "See details below";

  return String(value);
};

const flattenFields = (record, parentLabel = "", depth = 0) =>
  Object.entries(record || {}).flatMap(([key, value]) => {
    if (INTERNAL_FIELDS.has(key)) return [];
    const label = [parentLabel, readableLabel(key)].filter(Boolean).join(" - ");

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      typeof value.toHexString !== "function" &&
      depth < 3
    ) {
      return flattenFields(value, label, depth + 1);
    }

    if (
      Array.isArray(value) &&
      value.some(
        (item) =>
          item &&
          typeof item === "object" &&
          !(item instanceof Date) &&
          typeof item.toHexString !== "function",
      )
    ) {
      return value.flatMap((item, index) =>
        item && typeof item === "object"
          ? flattenFields(item, `${label} ${index + 1}`, depth + 1)
          : [],
      );
    }

    const formattedValue = formatValue(value, key);
    return formattedValue ? [[label, formattedValue]] : [];
  });

const ensureRoom = (document, height = 36) => {
  if (document.y + height > PAGE.bottom) document.addPage();
};

const appendSectionHeading = (document, title) => {
  ensureRoom(document, 42);
  document
    .moveDown(0.6)
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor("#17633E")
    .text(title, PAGE.left, document.y, {
      width: PAGE.right - PAGE.left,
    });
  document
    .moveDown(0.2)
    .moveTo(PAGE.left, document.y)
    .lineTo(PAGE.right, document.y)
    .lineWidth(1)
    .strokeColor("#D8E6DE")
    .stroke();
  document.moveDown(0.35);
};

const appendRecord = (document, record, title) => {
  ensureRoom(document, 40);
  const headingTop = document.y;
  document
    .roundedRect(
      PAGE.left,
      headingTop,
      PAGE.right - PAGE.left,
      22,
      4,
    )
    .fill("#EAF3EE");
  document
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#214C3F")
    .text(title, PAGE.left + 9, headingTop + 6, {
      width: PAGE.right - PAGE.left - 18,
    });
  document.y = headingTop + 29;

  const entries = flattenFields(record);
  if (!entries.length) {
    document
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#555555")
      .text("No details recorded.", PAGE.left, document.y + 3);
    document.moveDown(0.7);
    return;
  }

  entries.forEach(([label, formattedValue]) => {
    const rowText = `${label}: ${formattedValue}`;
    const valueOptions = {
      width: PAGE.right - PAGE.left - 18,
      lineGap: 2,
      paragraphGap: 2,
    };
    const valueHeight = document
      .font("Helvetica")
      .fontSize(9)
      .heightOfString(rowText, valueOptions);
    const rowHeight = Math.max(13, valueHeight);
    ensureRoom(document, rowHeight + PAGE.rowGap);
    const rowTop = document.y;

    document
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#59665F")
      .text(`${label}: `, PAGE.left + 9, rowTop, {
        continued: true,
      });
    document
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#222222")
      .text(formattedValue, valueOptions);
    document.y = Math.max(rowTop + rowHeight, document.y) + PAGE.rowGap;
  });

  ensureRoom(document, 8);
  document
    .moveTo(PAGE.left, document.y)
    .lineTo(PAGE.right, document.y)
    .lineWidth(0.5)
    .strokeColor("#D8E6DE")
    .stroke();
  document.moveDown(0.35);
};

const appendSection = (document, title, value) => {
  const records = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? [value]
      : [];

  appendSectionHeading(document, title);
  if (!records.length) {
    document
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#667085")
      .text("No records.", PAGE.left, document.y);
    return;
  }

  records.forEach((record, index) => {
    const recordTitle =
      records.length === 1
        ? title
        : `${title.replace(/s$/, "")} ${index + 1}`;
    appendRecord(document, record, recordTitle);
  });
};

const addPageChrome = (document, accountName) => {
  const pageRange = document.bufferedPageRange();
  for (let index = 0; index < pageRange.count; index += 1) {
    document.switchToPage(pageRange.start + index);
    document
      .save()
      .rect(0, 0, document.page.width, 76)
      .fill("#214C3F")
      .moveTo(document.page.width - 150, 0)
      .lineTo(document.page.width, 0)
      .lineTo(document.page.width, 68)
      .closePath()
      .fill("#2D6D59")
      .moveTo(document.page.width - 75, 0)
      .lineTo(document.page.width, 0)
      .lineTo(document.page.width, 38)
      .closePath()
      .fill("#3D8068")
      .rect(0, 76, document.page.width, 3)
      .fill("#D8B86A")
      .restore();
    document
      .save()
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#FFFFFF")
      .text("ASIATECH SYNC", PAGE.left, 19, {
        width: PAGE.right - PAGE.left,
        characterSpacing: 1.1,
      });
    document
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor("#B8DCC5")
      .text("ACCOUNT ARCHIVE", PAGE.right - 116, 22, {
        width: 116,
        align: "right",
        characterSpacing: 0.8,
      })
      .moveTo(PAGE.left, 43)
      .lineTo(PAGE.right, 43)
      .lineWidth(0.7)
      .strokeColor("#6FA68A")
      .stroke()
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#FFFFFF")
      .text(accountName, PAGE.left, 53, {
        width: PAGE.right - PAGE.left,
        ellipsis: true,
      });
    document
      .save()
      .moveTo(0, 785)
      .lineTo(0, document.page.height)
      .lineTo(150, document.page.height)
      .closePath()
      .fill("#E8F3EC")
      .moveTo(document.page.width, 778)
      .lineTo(document.page.width, document.page.height)
      .lineTo(document.page.width - 150, document.page.height)
      .closePath()
      .fill("#DCEFE3")
      .restore()
      .moveTo(PAGE.left, 790)
      .lineTo(PAGE.right, 790)
      .lineWidth(0.6)
      .strokeColor("#D8E6DE")
      .stroke();
    document
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#667085")
      .text("Confidential  |  Generated by ASIATECH SYNC", PAGE.left, 799, {
        width: 280,
      })
      .text(`Page ${index + 1} of ${pageRange.count}`, PAGE.left, 799, {
        width: PAGE.right - PAGE.left,
        align: "right",
      })
      .restore();
  }
};

const buildArchivePdf = (data) =>
  new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "A4",
      margins: { top: PAGE.top, bottom: 65, left: PAGE.left, right: 50 },
      bufferPages: true,
      info: {
        Title: `${data.user.fullName} Archived Account`,
        Author: "ASIATECH SYNC",
      },
    });
    const chunks = [];
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    document
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor("#17633E")
      .text("Archived Account Report", PAGE.left, PAGE.top);
    document
      .moveDown(0.25)
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor("#18263A")
      .text(data.user.fullName, { width: PAGE.right - PAGE.left });
    document
      .moveDown(0.25)
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#555555")
      .text(`Generated: ${new Date().toLocaleString()}`)
      .text(`Archived: ${formatValue(data.user.archivedAt, "archivedAt")}`);

    appendSection(document, "Account", {
      fullName: data.user.fullName,
      email: data.user.email,
      role: data.user.role,
      isActive: data.user.isActive,
      isArchived: data.user.isArchived,
      createdAt: data.user.createdAt,
      archivedAt: data.user.archivedAt,
    });
    SECTIONS.forEach(([title, key]) => appendSection(document, title, data[key]));

    addPageChrome(document, data.user.fullName);
    document.end();
  });

module.exports = { buildArchivePdf };
