require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const CompanyProfile = require("../models/CompanyProfile");
const { fileStillExists, isRemoteUrl } = require("./storage");

// Verify uploaded logos on startup and clean up DB entries that point at files which no
// longer exist. IMPORTANT: this only ever wipes local-disk references. A Cloudinary (or any
// remote http/https) URL is trusted as-is — previously this ran fs.existsSync() against
// every stored path regardless of provider, so on a host with ephemeral disk (Render,
// Railway, Heroku, etc.) *every restart* wiped companyUploadedLogo for logos that were
// actually fine, because the local disk itself had been wiped, not the logo. Local-mode
// deployments keep the original self-healing behavior unchanged.
const seedCompanyUploadedLogos = async () => {
  let verified = 0;
  let cleaned = 0;
  let skippedRemote = 0;

  try {
    const companiesWithLogos = await CompanyProfile.find({
      companyUploadedLogo: { $exists: true, $ne: "" },
    });

    if (companiesWithLogos.length > 0) {
      console.log(
        `[ASIATECH SYNC] Verifying ${companiesWithLogos.length} company logos...`,
      );
    }

    for (const company of companiesWithLogos) {
      if (isRemoteUrl(company.companyUploadedLogo)) {
        skippedRemote += 1;
        continue;
      }

      if (fileStillExists(company.companyUploadedLogo)) {
        verified += 1;
        console.log(
          `  ✓ [${verified}/${companiesWithLogos.length}] ${company.companyName}`,
        );
      } else {
        console.log(
          `  ✗ [CLEANED] ${company.companyName} (file missing from disk)`,
        );
        company.companyUploadedLogo = "";
        await company.save();
        cleaned += 1;
      }
    }

    return {
      verified,
      cleaned,
      skippedRemote,
      total: companiesWithLogos.length,
    };
  } catch (err) {
    console.error("[ASIATECH SYNC] Error verifying logos:", err.message);
    return { verified: 0, cleaned: 0, skippedRemote: 0, total: 0 };
  }
};

if (require.main === module) {
  (async () => {
    console.log(
      "[ASIATECH SYNC] Starting company uploaded logo verification...",
    );
    await connectDB();
    const result = await seedCompanyUploadedLogos();
    console.log(
      `\n[ASIATECH SYNC] ✓ Logo verification complete — ${result.verified} verified, ${result.cleaned} cleaned, ${result.skippedRemote} remote (skipped).`,
    );
    await mongoose.connection.close();
    process.exit(0);
  })().catch((err) => {
    console.error("[ASIATECH SYNC] ✗ Logo verification failed:", err);
    process.exit(1);
  });
}

module.exports = { seedCompanyUploadedLogos };
