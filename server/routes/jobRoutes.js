const express = require("express");
const Job = require("../models/Job");
const upload = require("../middleware/upload");
const { scanUploadedFile } = require("../middleware/scanUpload");

// Posters are optional - skip the security scan when no file is attached.
const scanUploadedFileIfProvided = (req, res, next) =>
  req.file ? scanUploadedFile(req, res, next) : next();
const CompanyProfile = require("../models/CompanyProfile");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");
const { seedJobs } = require("../utils/seedJobs");
const { notify } = require("../utils/notify");
const { emitDashboardUpdate } = require("../utils/socket");

const router = express.Router();

const parseSalaryNumbers = (value) => {
  if (!value || typeof value !== "string") return [];
  return [...value.matchAll(/\d[\d,]*(?:\.\d+)?/g)]
    .map((match) => Number(match[0].replace(/,/g, "")))
    .filter((n) => Number.isFinite(n));
};

const matchesSalaryRange = (job, minLimit, maxLimit) => {
  const numbers = parseSalaryNumbers(job.stipend || "");
  if (!numbers.length) return true;

  const minSalary = Math.min(...numbers);
  const maxSalary = Math.max(...numbers);
  return maxSalary >= minLimit && minSalary <= maxLimit;
};

// @route   GET /api/jobs
// @desc    Browse/search OJT vacancies with filters: department, skills, company, keyword
// @access  Public
router.get("/", async (req, res) => {
  try {
    const existingOpenJobs = await Job.countDocuments({ status: "open" });
    if (existingOpenJobs === 0) {
      const result = await seedJobs();
      console.log(
        `[ASIATECH SYNC] Auto-seeded job catalog because the database was empty (${result.created} created).`,
      );
    }

    const {
      department,
      skills,
      company,
      keyword,
      workSetup,
      jobType,
      salaryMin = 0,
      salaryMax = 9999999,
      page = 1,
      limit = 24,
    } = req.query;

    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const limitNumber = Math.min(
      100,
      Math.max(1, Number.parseInt(limit, 10) || 24),
    );

    const query = { status: "open" };

    if (department) query.department = new RegExp(`^${department}$`, "i");
    if (workSetup) query.workSetup = workSetup;
    if (jobType) query.jobType = jobType;
    if (company) query.company = company;
    if (skills) {
      const skillsArray = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (skillsArray.length) {
        query.skillsRequired = {
          $in: skillsArray.map((s) => new RegExp(s, "i")),
        };
      }
    }
    if (keyword) {
      query.$or = [
        { title: new RegExp(keyword, "i") },
        { description: new RegExp(keyword, "i") },
      ];
    }

    const skip = (pageNumber - 1) * limitNumber;

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate(
          "company",
          "companyName logoUrl companyUploadedLogo industry address isVerified",
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      Job.countDocuments(query),
    ]);

    const minValue = Number(salaryMin) || 0;
    const maxValue = Number(salaryMax) || 9999999;
    const filteredJobs = jobs.filter((job) =>
      matchesSalaryRange(job, minValue, maxValue),
    );

    res.json({
      jobs: filteredJobs,
      total: filteredJobs.length,
      page: pageNumber,
      pages: Math.ceil(filteredJobs.length / limitNumber),
    });
  } catch (err) {
    res
      .status(500)
      .json({
        message: "Failed to fetch jobs.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
  }
});

// @route   GET /api/jobs/meta/departments
// @desc    Distinct list of departments for filter dropdowns
router.get("/meta/departments", async (req, res) => {
  const departments = await Job.distinct("department", { status: "open" });
  res.json({ departments });
});

// @route   GET /api/jobs/:id
router.get("/:id", async (req, res) => {
  const job = await Job.findById(req.params.id).populate(
    "company",
    "companyName logoUrl companyUploadedLogo industry address website description isVerified user",
  );
  if (!job) return res.status(404).json({ message: "Job posting not found." });
  res.json({ job });
});

// @route   POST /api/jobs
// @desc    Create a new job posting (company only). jobType is mandatory: "OJT" for
//          internship slots, or "Full-Time Job" for regular paid openings.
router.post(
  "/",
  protect,
  authorize("company"),
  upload.uploadLogo.single("poster"),
  scanUploadedFileIfProvided,
  async (req, res) => {
  try {
    if (!["OJT", "Full-Time Job"].includes(req.body.jobType)) {
      return res.status(400).json({
        message:
          "Select whether this posting is an OJT slot or a Full-Time Job.",
      });
    }

    const companyProfile = await CompanyProfile.findOne({ user: req.user._id });
    if (!companyProfile) {
      return res.status(400).json({
        message: "Complete your company profile before posting a job.",
      });
    }
    const missingProfileFields = [
      !companyProfile.industry && "industry",
      !companyProfile.address && "address",
      !companyProfile.contactPerson && "contact person",
      !companyProfile.contactPhone && "contact phone",
    ].filter(Boolean);
    if (missingProfileFields.length) {
      return res.status(400).json({
        message: `Complete your company profile before posting a job or OJT opening. Missing: ${missingProfileFields.join(", ")}.`,
      });
    }

    const job = await Job.create({
      ...req.body,
      company: companyProfile._id,
      posterUrl: req.file ? req.file.path : "",
    });

    const recipients = await User.find({
      role: { $in: ["student", "coordinator", "admin"] },
      isActive: true,
      isArchived: false,
    }).select("fullName email");

    await Promise.all(
      recipients.map((recipient) =>
        notify({
          recipientUserId: recipient._id,
          recipientEmail: recipient.email,
          recipientName: recipient.fullName,
          type: "job_posted",
          title: `New ${job.jobType} opportunity posted`,
          body: `${companyProfile.companyName} posted a new ${job.jobType} opportunity: ${job.title}.`,
          link: `/jobs/${job._id}`,
        }),
      ),
    );

    // Real-time: student dashboards and admin job counts refresh instantly.
    emitDashboardUpdate({ roles: ["student", "admin"], scope: "jobs" });

    res.status(201).json({ job });
  } catch (err) {
    res
      .status(400)
      .json({
        message: "Failed to create job posting.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
  }
});

// @route   PUT /api/jobs/:id
// @desc    Update a job posting (owning company only)
router.put(
  "/:id",
  protect,
  authorize("company"),
  upload.uploadLogo.single("poster"),
  scanUploadedFileIfProvided,
  async (req, res) => {
  try {
    const companyProfile = await CompanyProfile.findOne({ user: req.user._id });
    const job = await Job.findOne({
      _id: req.params.id,
      company: companyProfile._id,
    });

    if (!job)
      return res
        .status(404)
        .json({ message: "Job posting not found or not owned by you." });

    Object.assign(job, req.body);
    if (req.file) job.posterUrl = req.file.path;
    await job.save();

    emitDashboardUpdate({ roles: ["student", "admin"], scope: "jobs" });

    res.json({ job });
  } catch (err) {
    res
      .status(400)
      .json({
        message: "Failed to update job posting.",
        ...(process.env.DEBUG_ERRORS === "true" && { error: err.message }),
      });
  }
});

// @route   DELETE /api/jobs/:id
router.delete("/:id", protect, authorize("company"), async (req, res) => {
  const companyProfile = await CompanyProfile.findOne({ user: req.user._id });
  const job = await Job.findOneAndDelete({
    _id: req.params.id,
    company: companyProfile._id,
  });
  if (!job)
    return res
      .status(404)
      .json({ message: "Job posting not found or not owned by you." });

  emitDashboardUpdate({ roles: ["student", "admin"], scope: "jobs" });

  res.json({ message: "Job posting deleted." });
});

// @route   GET /api/jobs/company/mine
// @desc    All job postings created by the logged-in company
router.get("/company/mine", protect, authorize("company"), async (req, res) => {
  const companyProfile = await CompanyProfile.findOne({ user: req.user._id });
  const jobs = await Job.find({ company: companyProfile._id }).sort({
    createdAt: -1,
  });
  res.json({ jobs });
});

module.exports = router;
