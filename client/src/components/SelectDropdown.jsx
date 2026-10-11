import React, { useEffect, useRef, useState } from "react";

// Generic dropdown built in the same design language as CourseSelect: an
// input-field trigger button with a rotating chevron, and a floating rounded
// panel for the options. Used anywhere a short option list is captured so every
// dropdown in the system looks and behaves the same way.
//
// onChange is called with { target: { name, value } }, so it drops in wherever a
// native <select> was used before (form handlers, filters, controlled state).
const SelectDropdown = ({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = "Select…",
  required = false,
  disabled = false,
  allowEmpty = false,
  className = "input-field",
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const selected = options.find((option) => option.value === value);
  const selectedLabel = selected ? selected.label : placeholder;

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const choose = (optionValue) => {
    onChange({ target: { name, value: optionValue } });
    setOpen(false);
  };

  const optionClass = (isSelected) =>
    `w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
      isSelected
        ? "bg-[#dfeecf] font-semibold text-[#5E7867]"
        : "text-navy hover:bg-white/75"
    }`;

  return (
    <div ref={wrapperRef} className="relative w-full">
      {name && (
        <input
          type="hidden"
          name={name}
          value={value || ""}
          required={required}
        />
      )}
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`${className} flex items-center justify-between gap-3 text-left ${
          disabled ? "cursor-not-allowed opacity-60" : ""
        }`}
      >
        <span className={`truncate ${selected ? "text-navy" : "text-navy/65"}`}>
          {selectedLabel}
        </span>
        <span
          aria-hidden="true"
          className={`shrink-0 text-xs text-[#5E7867] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      {open && !disabled && (
        <div
          role="listbox"
          aria-label={placeholder}
          className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 max-h-72 overflow-y-auto rounded-xl border border-white/55 bg-[#edf7ef]/98 p-1.5 shadow-[0_16px_35px_rgba(15,30,53,0.16)] backdrop-blur-xl"
        >
          {allowEmpty && (
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => choose("")}
              className={optionClass(!value)}
            >
              {placeholder}
            </button>
          )}
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              onClick={() => choose(option.value)}
              className={optionClass(value === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SelectDropdown;
