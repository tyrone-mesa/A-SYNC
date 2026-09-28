import React, { useEffect, useRef, useState } from "react";
import { BACHELOR_PROGRAMS, ASSOCIATE_PROGRAMS } from "../constants/courses";

// Grouped dropdown of the school's degree programs, used anywhere a student's course is
// captured or edited so it stays a controlled list instead of free text.
const CourseSelect = ({
  id,
  name = "course",
  value,
  onChange,
  required,
  className = "input-field",
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const selectedLabel = value || "Select a course / program";

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const chooseCourse = (course) => {
    onChange({ target: { name, value: course } });
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
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
        <span className={`truncate ${value ? "text-navy" : "text-navy/65"}`}>
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
          aria-label="Course or program options"
          className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 max-h-72 overflow-y-auto rounded-xl border border-white/55 bg-[#edf7ef]/98 p-1.5 shadow-[0_16px_35px_rgba(15,30,53,0.16)] backdrop-blur-xl"
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => chooseCourse("")}
            className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
              !value
                ? "bg-[#dfeecf] font-semibold text-[#5E7867]"
                : "text-navy hover:bg-white/75"
            }`}
          >
            Select a course / program
          </button>
          <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5E7867]/75">
            Bachelor's Degree Programs
          </p>
          {BACHELOR_PROGRAMS.map((course) => (
            <CourseOption
              key={course}
              course={course}
              selected={value === course}
              onSelect={chooseCourse}
            />
          ))}
          <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5E7867]/75">
            Two-Year Associate Programs
          </p>
          {ASSOCIATE_PROGRAMS.map((course) => (
            <CourseOption
              key={course}
              course={course}
              selected={value === course}
              onSelect={chooseCourse}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CourseOption = ({ course, selected, onSelect }) => (
  <button
    type="button"
    role="option"
    aria-selected={selected}
    onClick={() => onSelect(course)}
    className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
      selected
        ? "bg-[#dfeecf] font-semibold text-[#5E7867]"
        : "text-navy hover:bg-white/75"
    }`}
  >
    {course}
  </button>
);

export default CourseSelect;
