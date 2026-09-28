// Every attendance timestamp in ASIATECH SYNC is anchored to Philippine Standard Time
// (Asia/Manila, UTC+8, no daylight saving) regardless of where the server itself runs.
const PH_TIMEZONE = "Asia/Manila";

// "2026-08-23" style calendar date in PH time, used to group attendance logs by day.
const getPhilippineDateString = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: PH_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const getPhilippineMonthString = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: PH_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).format(date);

// "2:45 PM" style clock time in PH time, for human-readable logs/messages.
const getPhilippineTimeString = (date = new Date()) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: PH_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);

module.exports = {
  PH_TIMEZONE,
  getPhilippineDateString,
  getPhilippineMonthString,
  getPhilippineTimeString,
};
