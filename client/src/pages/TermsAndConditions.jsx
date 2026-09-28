import React from "react";
import LegalPageLayout from "../components/LegalPageLayout";

const TermsAndConditions = () => (
  <LegalPageLayout title="Terms & Conditions" lastUpdated="September 2026">
    <p>
      By creating an account or otherwise using ASIATECH SYNC ("the
      Platform"), you agree to the terms below. If you don't agree, please
      don't use the Platform.
    </p>

    <h2 className="font-display text-lg font-semibold text-navy pt-2">
      Accounts
    </h2>
    <p>
      Student accounts are created by the school administration using an
      official school email address and are for the exclusive use of that
      student. Company accounts are self-registered and reviewed by an
      administrator before activation. You're responsible for keeping your
      login credentials confidential and for all activity under your
      account.
    </p>

    <h2 className="font-display text-lg font-semibold text-navy pt-2">
      Acceptable use
    </h2>
    <p>
      You agree not to upload malicious files, impersonate another person or
      organization, post false or misleading job listings, harvest other
      users' personal data, or attempt to circumvent the Platform's security
      controls. Uploaded documents must belong to you (students) or be
      authorized for your organization (companies).
    </p>

    <h2 className="font-display text-lg font-semibold text-navy pt-2">
      Company partners
    </h2>
    <p>
      Company accounts are verified by an administrator before they can post
      opportunities. Companies are responsible for the accuracy of job
      postings and for handling applicant data received through the
      Platform in accordance with applicable data privacy law.
    </p>

    <h2 className="font-display text-lg font-semibold text-navy pt-2">
      OJT records
    </h2>
    <p>
      Attendance, hours, grades, and evaluations recorded through the
      Platform are used by the school for academic OJT/internship
      requirements. Once a company submits a final assessment for a student,
      that record is locked and cannot be edited.
    </p>

    <h2 className="font-display text-lg font-semibold text-navy pt-2">
      Availability
    </h2>
    <p>
      The Platform is provided "as is." We make reasonable efforts to keep
      it available and your data safe, but we don't guarantee uninterrupted
      access and are not liable for indirect or incidental damages arising
      from its use, to the extent permitted by law.
    </p>

    <h2 className="font-display text-lg font-semibold text-navy pt-2">
      Changes
    </h2>
    <p>
      We may update these terms from time to time. Continued use of the
      Platform after changes are posted constitutes acceptance of the
      updated terms.
    </p>
  </LegalPageLayout>
);

export default TermsAndConditions;
