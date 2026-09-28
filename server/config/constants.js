// Central place for platform-wide constants so the allowed student email
// domain only needs to be changed in one spot.
module.exports = {
  STUDENT_EMAIL_DOMAIN: 'asiatech.edu.ph',
  // Students need at least this many completed OJT hours before they can apply to a
  // "Full-Time Job" posting. OJT postings have no such gate — that's how hours get earned
  // in the first place.
  MIN_HOURS_FOR_FULLTIME_JOBS: 300,
};
