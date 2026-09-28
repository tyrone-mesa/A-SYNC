import React, { useState } from "react";
import {
  resolveCompanyLogoUrl,
  getCompanyInitials,
  getCompanyAvatarColor,
} from "../utils/companyLogo";

/**
 * Renders a company's uploaded logo, or a generated initials badge if there
 * isn't one (or it fails to load). No dependency on any external logo API
 * and no static "default logo" file that can go missing/empty.
 *
 * Usage: <CompanyLogo company={job.company} className="h-9 w-9" />
 */
const CompanyLogo = ({ company, className = "h-9 w-9", roundedClassName = "rounded-2xl" }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const src = resolveCompanyLogoUrl(company);
  const name = company?.companyName || "Company";

  if (src && !imgFailed) {
    return (
      <div
        className={`${className} ${roundedClassName} flex-shrink-0 overflow-hidden bg-[#f2f6f2] flex items-center justify-center`}
      >
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  const bg = getCompanyAvatarColor(name);
  return (
    <div
      className={`${className} ${roundedClassName} flex-shrink-0 flex items-center justify-center font-bold text-white`}
      style={{ backgroundColor: bg, fontSize: "0.85em" }}
      title={name}
    >
      {getCompanyInitials(name)}
    </div>
  );
};

export default CompanyLogo;
