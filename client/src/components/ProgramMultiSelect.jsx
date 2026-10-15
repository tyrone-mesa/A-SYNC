import React from "react";
import { BACHELOR_PROGRAMS, ASSOCIATE_PROGRAMS } from "../constants/courses";

// Checkbox list of the school's course / programs, grouped like CourseSelect. Used when an
// admin picks which program(s) a coordinator oversees.
const ProgramMultiSelect = ({ value = [], onChange, idPrefix = "programs" }) => {
  const toggle = (program) =>
    onChange(
      value.includes(program)
        ? value.filter((item) => item !== program)
        : [...value, program],
    );

  const renderGroup = (title, programs) => (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5E7867]/75">
        {title}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {programs.map((program) => {
          const checked = value.includes(program);
          const id = `${idPrefix}-${program.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
          return (
            <label
              key={program}
              htmlFor={id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                checked
                  ? "border-[#bfd9a8] bg-[#dfeecf] font-semibold text-[#5E7867]"
                  : "border-white/55 bg-white/65 text-navy hover:bg-white/85"
              }`}
            >
              <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={() => toggle(program)}
                className="h-4 w-4 shrink-0 accent-[#5E7867]"
              />
              <span className="min-w-0 break-words">{program}</span>
            </label>
          );
        })}
      </div>
    </div>
  );

  return (
    <fieldset className="space-y-4">
      <legend className="label">
        Course / Program
        <span className="ml-2 text-sm font-normal text-navy/65">
          {value.length === 0
            ? "Select at least one"
            : `${value.length} selected`}
        </span>
      </legend>
      {renderGroup("Bachelor's Degree Programs", BACHELOR_PROGRAMS)}
      {renderGroup("Two-Year Associate Programs", ASSOCIATE_PROGRAMS)}
    </fieldset>
  );
};

export default ProgramMultiSelect;
