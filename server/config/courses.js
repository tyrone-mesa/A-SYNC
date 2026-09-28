// Single source of truth for the school's academic programs, used to validate the
// "course" field whenever an admin creates or edits a student profile.
const BACHELOR_PROGRAMS = [
  'BS Business Administration',
  'BS Computer Engineering',
  'BS Computer Science',
  'BS Criminology',
  'BS Education',
  'BS Hospitality Management',
  'BS Information System',
  'BS Information Technology',
  'BS Tourism Management',
];

const ASSOCIATE_PROGRAMS = [
  'Associate in Hospitality Management',
  'Associate in Information Technology',
];

const ALL_PROGRAMS = [...BACHELOR_PROGRAMS, ...ASSOCIATE_PROGRAMS];

module.exports = { BACHELOR_PROGRAMS, ASSOCIATE_PROGRAMS, ALL_PROGRAMS };
