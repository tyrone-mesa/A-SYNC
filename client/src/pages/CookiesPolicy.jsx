import React from "react";
import LegalPageLayout from "../components/LegalPageLayout";

const CookiesPolicy = () => (
  <LegalPageLayout title="Cookies Policy" lastUpdated="September 2026">
    <p>
      ASIATECH SYNC uses browser local storage to keep you signed in between
      visits (your session token) and to remember basic UI preferences. We
      don't use third-party advertising or tracking cookies.
    </p>

    <h2 className="font-display text-lg font-semibold text-navy pt-2">
      What we store locally
    </h2>
    <p>
      A signed authentication token so you don't have to log in on every
      page load, and small UI state such as whether sound is muted on the
      homepage video. This data stays in your browser and is not shared
      with third parties.
    </p>

    <h2 className="font-display text-lg font-semibold text-navy pt-2">
      Managing this
    </h2>
    <p>
      You can clear this data at any time by logging out, or by clearing
      your browser's site data for this domain. Doing so will sign you out
      and reset any saved preferences.
    </p>
  </LegalPageLayout>
);

export default CookiesPolicy;
