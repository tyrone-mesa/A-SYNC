# ASIATECH SYNC

A full-stack platform that connects OJT (On-the-Job Training) students and interns with corporate
partner companies for seamless internship placement.

## Tech Stack

- **Frontend:** React (functional components + hooks), React Router, Tailwind CSS, Axios
- **Backend:** Node.js, Express, JWT authentication
- **Database:** MongoDB with Mongoose

## Visual Identity

The UI follows a light, editorial-style layout inspired by the school's official reference
design: a forest-green header/footer bookending a warm, light-cream page, white cards, bold
display headlines, and fully pill-shaped buttons.

| Role                            | Color         | Hex       |
| ------------------------------- | ------------- | --------- |
| Header / Footer / Dark Accents  | Forest Green  | `#17633E` |
| Primary Accent / CTAs           | Golden Yellow | `#F6C744` |
| Body Text / Secondary Structure | Deep Navy     | `#18263A` |
| Input Fields / Soft Surfaces    | Soft Gray     | `#D9DEE5` |
| Page Background                 | Warm Cream    | `#FFF8E7` |
| Alerts / Rejections             | Coral Red     | `#F05B50` |

These are defined as Tailwind theme tokens in `client/tailwind.config.js`
(`forest`, `gold`, `navy`, `gray`, `cream`, `coral`) and consumed through a small set of shared
component classes in `client/src/index.css` (`.btn-primary`, `.btn-secondary`, `.btn-danger`,
`.card`, `.input-field`, `.label`) — changing a token or class there updates every page at once.
A custom SVG seal mark (`client/src/components/Logo.jsx`) appears in the header, on the landing
page, and on the login/registration cards.

Motion is handled with Framer Motion: scroll-triggered fade-ins and staggered entrances on the
landing page, soft cross-fade + slide transitions between routes (see `App.js`), a branded
pulsing-seal loading screen, and press/hover micro-interactions on every button.

## Project Structure

```
asiatech-sync/
├── server/                  # Express API
│   ├── config/               # db.js, constants.js (email domain), courses.js (program list)
│   ├── models/                User, StudentProfile, CompanyProfile, Job, Application, AttendanceLog
│   ├── middleware/            auth.js (JWT + role guard), upload.js (resume/transcript files)
│   ├── routes/                 authRoutes, studentRoutes, companyRoutes, jobRoutes,
│   │                            applicationRoutes, adminRoutes (also serves coordinators)
│   ├── utils/                  generateToken.js, generateTempPassword.js, philippineTime.js, seedAdmin.js
│   ├── server.js               App entry point
│   └── .env.example
│
└── client/                  # React app
    ├── src/
    │   ├── api/axios.js      # Axios instance with JWT interceptor
    │   ├── constants/courses.js  # Bachelor's & Associate program lists
    │   ├── context/AuthContext.js
    │   ├── components/       # Navbar, ProtectedRoute, JobCard, StatusBadge, Loader,
    │   │                        CourseSelect, TimeTracker
    │   └── pages/
    │       ├── student/      # Dashboard (incl. Time In/Out), Profile, BrowseJobs, JobDetail,
    │       │                    MyApplications
    │       ├── company/      # Dashboard, PostJob, ManageJobs, ApplicantsList
    │       └── admin/        # Dashboard, ManageUsers, ManageStudents, StudentDetail,
    │                            ManageCoordinators, ManageCompanies, CompanyDetail
    ├── tailwind.config.js    # Brand palette tokens
    └── .env.example
```

### Development test accounts

In the server directory, set `NODE_ENV=development` (or `test`) and run
`npm run seed:test-accounts`. The command is manual, refuses other environments, and is not
run on server startup. It creates or refreshes only the matching test identities in the
existing `User` collection; a name/role collision is rejected rather than changing that
account. Passwords are hashed by the existing User model.

| Role | Login email | Password |
| --- | --- | --- |
| Student | `teststudent@asiatech.edu.ph` | `12345678` |
| Company | `testcompany@example.com` | `12345678` |
| Coordinator | `testcoordinator@example.com` | `12345678` |
| Registrar | `testregistrar@example.com` | `12345678` |

The student also uses the existing monthly OTP step; the seed stores the development OTP
`123456` as a hash for the current month. The company profile is pre-verified for local
testing, and the student has a linked profile. Do not seed these accounts into production.

To review a dry-run removal plan, use `npm run remove:test-accounts` from `server/` with
`NODE_ENV=development` (or `test`). To delete the matching accounts and their linked test
profiles, jobs, applications, messages, concerns, notifications, and uploads, repeat with
`npm run remove:test-accounts -- --confirm-test-account-removal`. The script refuses
production mode and aborts if a linked profile does not match the seed's identifying
markers; inspect the plan before confirming.

## Core Features

- **Multi-role JWT auth** — companies self-register from the public site; admins are seeded.
  **Student accounts are created only by an administrator**, using an email on the school's
  domain (`@asiatech.edu.ph` by default — change it in `server/config/constants.js`). The admin
  sets the student's academic info **and their login password** directly on the creation form,
  then shares both the email and password with the student securely. Each role has its own
  protected dashboard and route guards on both client and server.
- **Admin drill-down views** — from **Admin → Manage Students**, an admin can open any student
  and see a read-only version of that student's own dashboard: profile, uploaded resume/transcript,
  skills, attendance history, and every application with its status. From **Admin → Verify
  Companies**, an admin can open "View Dashboard" on any company to see that company's job
  postings, slot counts, and applicant totals — the same view the company sees when logged in.
- **Admin edit & delete for students** — from a student's detail page, an admin can edit their
  academic info (course, year level, department, goal hours) or permanently delete the
  account, which cascades to remove their applications and attendance history too.
- **Coordinators** — a fourth, admin-created role with deliberately narrow read-only access to
  the student roster and detail pages. Coordinators can view authorized student resumes through
  the protected resume endpoint, while transcript, bio, and application history remain withheld.
  Admins register coordinators from **Admin → Manage Coordinators**, using the same
  temporary-password flow as before (coordinators still get a system-generated password — the
  admin-set password only applies to student creation).
- **Academic programs** — course/program is a controlled dropdown everywhere it's captured
  (admin creation, admin edit, and the student's own profile), grouped into Bachelor's Degree
  Programs and Two-Year Associate Programs. The list lives in one place per side —
  `server/config/courses.js` and `client/src/constants/courses.js`.
- **Goal hours & attendance (Time In / Time Out)** — an admin sets each student's goal OJT hours
  (e.g. 480) when creating or editing their account. On the student dashboard, a Time In / Time
  Out widget records attendance with the date and clock time captured automatically — the student
  never types either — using Philippine Standard Time (`Asia/Manila`, UTC+8) regardless of where
  the server runs. Timing out closes the session, calculates the hours rendered, adds them to the
  student's completed-hours total, and shows a live progress bar toward the goal. Admins see this
  alongside full profile/document/application data; coordinators see only this hours view.
- **Student profile & documents** — students fill in course, department, skills, and bio, and
  upload a resume and transcript/COR. Resumes are served only through the JWT-protected
  `/api/students/:studentId/resume` endpoint; other uploaded assets retain their existing URLs.
- **Forgot password** — reachable from every tab on the Login page (Student, Company, Admin).
  Requesting a reset always returns the same generic message regardless of whether the email
  exists, so the endpoint can't be used to enumerate accounts. A hashed, 10-minute-expiry
  6-digit code is emailed via the same SMTP setup used for application notifications
  (`POST /api/auth/forgot-password` → `POST /api/auth/reset-password`, the latter taking the
  email, the code, and the new password together). The code locks out after 5 wrong guesses.
  If SMTP isn't configured, the code is returned directly in the API response instead, so the
  flow is still fully testable in local development without a real mail server. Separately,
  `PUT /api/auth/change-password` lets an already-logged-in user (e.g. from the student profile
  page) change their password by providing their current one — no email round-trip needed.
- **Company portal** — a company account can't log in until an admin verifies it (see below).
  Once verified, employers manage a company profile, post OJT vacancies, and review each
  applicant's profile, resume, transcript, and cover note, updating their status as they progress.
- **Matching & search system** — the public "Browse OJT Openings" page filters live job postings by
  department, required skills, keyword, and work setup.
- **Application tracking** — students see real-time status (`pending → under_review → shortlisted →
accepted/rejected`) with a color-coded badge, and can withdraw an active application.
- **Admin console** — platform stats, the ability to enable/disable any account, and a company
  verification queue before employers' postings are treated as fully trusted partners.

## Setup Instructions

### 1. Prerequisites

- Node.js 18+
- A MongoDB instance (local `mongod`, or a free MongoDB Atlas cluster)

### 2. Backend

```bash
cd server
cp .env.example .env      # then edit MONGO_URI, JWT_SECRET, ADMIN_EMAIL/PASSWORD as needed
npm install
npm run seed:admin        # creates the initial admin account from .env
npm run dev                # starts the API on http://localhost:5000
```

### 3. Frontend

```bash
cd client
cp .env.example .env      # REACT_APP_API_URL should point at the backend, e.g. http://localhost:5000/api
npm install
npm start                  # starts the app on http://localhost:3000
```

### 4. Try it out

1. Register a **company** account. It can't log in yet — a new company account is pending
   verification, so registration returns a confirmation message instead of signing you in.
2. Log in as the seeded **admin** account and verify the company from **Admin → Verify
   Companies**. Only now can that company log in and post an OJT opening.
3. From **Admin → Manage Students**, click **+ Add Student**, choose a course/program (e.g. _BS
   Information Technology_), set the Goal Hours (e.g. `480`), set a password for the student, and
   create the account with an `@asiatech.edu.ph` email.
4. Optionally, from **Admin → Manage Coordinators**, create a coordinator account the same way —
   they'll only ever be able to view the student roster.
5. Log out, log back in as that student with the password you set, complete the profile
   (including at least one skill), apply to the opening from **Browse OJT Openings**, and try
   **Time In** / **Time Out** on the dashboard — the date/time are stamped automatically in
   Philippine time, and completed hours accumulate toward the goal.
6. Back in the company portal, review the applicant and update their status — the student sees
   the change reflected instantly in **My Applications**. The admin (or a coordinator) can check
   the student's full attendance and application history any time from **Manage Students**, and
   the admin can edit or delete that student's account from the same detail page.

## Notes for Production

- Never commit `.env` files or production credentials. Use the deployment platform's secret
  manager and rotate any credentials that may have been exposed.
- The Render deployment setup and required production services are documented in
  [`DEPLOY_CHECKLIST.md`](./DEPLOY_CHECKLIST.md); the root `render.yaml` defines the Blueprint.
- On Render, the React app and API are served from the same origin. For other hosting setups,
  set `CLIENT_URL` to the frontend origin and `REACT_APP_API_URL` to the API URL before
  building the client.
- Production uploads should use durable object storage. The Render Blueprint uses Cloudinary;
  local disk storage is intended for development or hosts with a persistent disk.
- The allowed student email domain lives in `server/config/constants.js`
  (`STUDENT_EMAIL_DOMAIN`) — update it if the school's domain changes.
