import React, { useEffect, useRef, useState } from "react";

const YEAR_LEVELS = ["1st", "2nd", "3rd", "4th"];

const YearLevelSelect = ({
  id,
  name = "yearLevel",
  value,
  onChange,
  required,
  className = "input-field",
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const selectedLabel = value || "Select year level";

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const chooseYearLevel = (yearLevel) => {
    onChange({ target: { name, value: yearLevel } });
    setOpen(false);
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full ${open ? "z-40" : ""}`}
    >
      <input
        type="hidden"
        name={name}
        value={value || ""}
        required={required}
      />
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`${className} flex items-center justify-between gap-3 text-left`}
      >
        <span className={value ? "text-navy" : "text-navy/65"}>
          {selectedLabel}
        </span>
        <span
          aria-hidden="true"
          className={`shrink-0 text-xs text-[#5E7867] transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Year level options"
          className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 rounded-xl border border-white/55 bg-[#edf7ef] p-1.5 shadow-[0_16px_35px_rgba(15,30,53,0.16)] backdrop-blur-xl"
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => chooseYearLevel("")}
            className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
              !value
                ? "bg-[#dfeecf] font-semibold text-[#5E7867]"
                : "text-navy hover:bg-white/75"
            }`}
          >
            Select year level
          </button>
          {YEAR_LEVELS.map((yearLevel) => (
            <button
              key={yearLevel}
              type="button"
              role="option"
              aria-selected={value === yearLevel}
              onClick={() => chooseYearLevel(yearLevel)}
              className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                value === yearLevel
                  ? "bg-[#dfeecf] font-semibold text-[#5E7867]"
                  : "text-navy hover:bg-white/75"
              }`}
            >
              {yearLevel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default YearLevelSelect;
