// Run with: npm run seed:jobs
// Loads the full catalog of sample job postings (server/data/jobsSeedData.json) into the
// database. For every posting, finds or creates a verified CompanyProfile (and a matching
// login account) for that company by name, then creates the Job itself — skipping any job
// that already exists for that company (matched by title), so this script is safe to re-run.
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const CompanyProfile = require("../models/CompanyProfile");
const Job = require("../models/Job");
const jobListings = require("../data/jobsSeedData.json");

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const findOrCreateCompany = async (companyName) => {
  let company = await CompanyProfile.findOne({ companyName });
  if (company) return company;

  const slug = slugify(companyName);
  const email = `hr+${slug}@asiatech-sync-demo.local`;

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      fullName: `${companyName} HR Team`,
      email,
      password: `sync-${Math.random().toString(36).slice(2, 12)}`,
      role: "company",
    });
  }

  company = await CompanyProfile.create({
    user: user._id,
    companyName,
    isVerified: true, // pre-verified so these sample postings are immediately browsable
  });

  return company;
};

const seedJobs = async () => {
  let created = 0;
  let skipped = 0;
  let companiesCreated = 0;
  const seenCompanies = new Set();

  for (const listing of jobListings) {
    const existingCompanyCount = await CompanyProfile.countDocuments({
      companyName: listing.companyName,
    });
    if (existingCompanyCount === 0 && !seenCompanies.has(listing.companyName)) {
      companiesCreated += 1;
    }
    seenCompanies.add(listing.companyName);

    const company = await findOrCreateCompany(listing.companyName);

    const alreadyExists = await Job.findOne({
      title: listing.title,
      company: company._id,
    });
    if (alreadyExists) {
      skipped += 1;
      continue;
    }

    await Job.create({
      company: company._id,
      title: listing.title,
      department: listing.department,
      jobType: listing.jobType || "Full-Time Job",
      description: listing.description,
      skillsRequired: listing.skillsRequired || [],
      location: listing.location || "Philippines",
      workSetup: listing.workSetup || "On-site",
      stipend: listing.salary || "Not specified",
      slotsAvailable: 1,
      status: "open",
    });
    created += 1;
  }

  return {
    created,
    skipped,
    companiesCreated,
    totalCompanies: seenCompanies.size,
  };
};

if (require.main === module) {
  (async () => {
    await connectDB();

    const result = await seedJobs();

    console.log(
      `[ASIATECH SYNC] Job seed complete — ${result.created} job(s) created, ${result.skipped} already existed, ` +
        `${result.companiesCreated} new company account(s) created (${result.totalCompanies} unique companies total).`,
    );

    await mongoose.connection.close();
    process.exit(0);
  })().catch((err) => {
    console.error("[ASIATECH SYNC] Job seed failed:", err);
    process.exit(1);
  });
}

module.exports = { seedJobs, findOrCreateCompany };
