import React from "react";
import LegalPageLayout from "../components/LegalPageLayout";

const PrivacyPolicy = () => (
  <LegalPageLayout title="Privacy Policy" lastUpdated="September 2026">
    <p>
      ASIATECH SYNC ("the Platform") is an OJT/internship placement system
      used by students, industry partner companies, and school staff. This
      policy explains what personal data we collect, why we collect it, and
      how it's protected, in line with the Philippine Data Privacy Act of
      2012 (RA 10173).
    </p>

    <h2 className="font-display text-lg font-semibold text-navy pt-2">
      What we collect
    </h2>
    <p>
      Depending on your role, we process: your name, school email address,
      and login credentials; academic details such as course, year level,
      and department; uploaded documents including resumes, transcripts,
      certificates, and profile pictures; OJT attendance and hours logged
      through the Platform; application and messaging history between
      students and companies; and, for company accounts, business details
      such as company name, industry, and contact information.
    </p>

    <h2 className="font-display text-lg font-semibold text-navy pt-2">
      Why we collect it
    </h2>
    <p>
      We use this data to operate the OJT placement process: matching
      students with opportunities, tracking attendance and required hours,
      enabling communication between students and companies, generating
      reports for the school's OJT coordinators, and maintaining basic
      account security (audit logs, rate limiting, and abuse prevention).
    </p>

    <h2 className="font-display text-lg font-semibold text-navy pt-2">
      Who can see it
    </h2>
    <p>
      Student profile pictures, resumes, and transcripts are never public —
      they're only accessible to the student themselves, school
      administrators and coordinators, and a company you've actively applied
      to. Company logos and public job postings are visible to anyone
      browsing the Platform. Internal admin tooling and audit logs are
      restricted to authorized school staff.
    </p>

    <h2 className="font-display text-lg font-semibold text-navy pt-2">
      Where it's stored
    </h2>
    <p>
      Data is stored in a managed database and, depending on configuration,
      either on the application server or with a third-party file storage
      provider used specifically to keep uploaded documents durable across
      deployments. We do not sell personal data to third parties.
    </p>

    <h2 className="font-display text-lg font-semibold text-navy pt-2">
      Your rights
    </h2>
    <p>
      You may request access to, correction of, or deletion of your personal
      data by contacting the school's OJT/admin office through the "Send a
      Concern" form on the homepage or your usual school channel. Student
      accounts are created and managed by the school administration.
    </p>

    <h2 className="font-display text-lg font-semibold text-navy pt-2">
      Changes to this policy
    </h2>
    <p>
      We may update this policy as the Platform evolves. Material changes
      will be reflected by updating the "Last updated" date above.
    </p>
  </LegalPageLayout>
);

export default PrivacyPolicy;
