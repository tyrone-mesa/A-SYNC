import React from "react";

const Logo = ({ size = 40, className = "" }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "8px",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <img
      src="/system-logo/A-Sync-Logo.svg"
      alt="A-Sync official logo"
      width={size}
      height={size}
      className={`${className} object-contain`}
      style={{
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
      }}
    />
  </div>
);

export default Logo;
