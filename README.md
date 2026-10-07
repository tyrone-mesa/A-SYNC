# ASIATECH SYNC

A full-stack web platform that connects OJT students and interns with companies for OJT and employment opportunities.

## Tech Stack

- **Frontend:** React 18, React Router, Tailwind CSS, Axios, Socket.IO Client, Framer Motion
- **Backend:** Node.js 20, Express, JWT authentication, Socket.IO
- **Database:** MongoDB with Mongoose
- **File Storage:** Local storage by default, with optional Cloudinary storage for persistent uploads
- **Email:** Resend API
- **Optional AI:** Anthropic API for the interview feature

## Project Structure

```text
A-Sync/
├── server/
│   ├── config/
│   ├── data/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── test/
│   ├── server.js
│   └── .env.example
├── client/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── .env.example
├── package.json
└── railpack.json
```

## User Roles

The system currently supports five roles:

- **Student**
- **Company**
- **Admin**
- **Coordinator**
- **Registrar**

### Student

Students can:

- Access their dashboard and profile
- Manage their academic information, skills, bio, resume, transcript/COR, and avatar
- Browse OJT and full-time job postings
- Apply to jobs and track application status
- Withdraw active applications
- Record OJT Time In and Time Out
- Track completed OJT hours against their required goal
- Access the OJT manual
- Use the interview feature
- Receive notifications
- Send and receive messages

Student accounts are created by an administrator using the configured school email domain.

### Company

Companies can:

- Register for an account
- Complete and manage their company profile
- Upload and remove their company logo
- Post OJT and full-time job openings
- Edit, close, and manage their job postings
- View applicants
- Review applicant profiles and submitted documents
- Update application status
- View OJT students and attendance information
- Record or manage attendance-related information
- Submit student assessments
- Export supported student information

Company accounts require administrator verification before the company can access the protected company portal.

### Admin

Admins can:

- View system statistics and reports
- Manage users
- Create, edit, and delete student accounts
- Manage coordinators
- Manage registrars
- Review and verify companies
- View company dashboards
- Manage jobs and applications
- Manage archived records
- Review security audit records
- Enable or disable user accounts
- Manage student OJT information and records

### Coordinator

Coordinators are created by administrators and have restricted access to student information.

They can:

- View the student roster
- View authorized student details
- Access authorized student resumes
- View OJT hours and attendance information
- Perform coordinator-supported assessment functions

Coordinator access is intentionally more limited than administrator access.

### Registrar

Registrars are created and managed by administrators and have access to registrar-specific student management functions.

## Core Features

### Authentication and Account Management

- JWT-based authentication
- Role-based authorization
- Student, company, admin, coordinator, and registrar accounts
- Company verification before company portal access
- Forgot-password and reset-password flow
- Authenticated password change
- Account enable/disable controls
- Monthly student OTP verification

### Jobs and Applications

- Public job browsing
- OJT and Full-Time Job posting types
- Department, skills, keyword, and work-setup filtering
- Job locations, available slots, required hours, stipend or salary information, deadlines, and posting status
- Company job creation and management
- Student applications
- Application status tracking:
  `pending → under_review → shortlisted → accepted/rejected`
- Application withdrawal for active applications

### Student OJT Management

- Required and completed OJT hours
- Time In and Time Out attendance tracking
- Philippine time (`Asia/Manila`) for attendance timestamps
- Attendance history
- OJT progress tracking
- OJT manual access
- Company-side student attendance and assessment functions

### Profiles and Documents

Students can manage:

- Course/program
- Year level
- Department
- Skills
- Bio
- Phone and address
- Resume
- Transcript/COR
- Profile avatar
- Company placement
- OJT performance and assessment information

Company profiles include company information, contact details, verification status, and company logo.

### Notifications and Messaging

The system includes:

- In-app notifications
- Unread notification counts
- Real-time messaging
- Conversations
- Public concerns and replies
- Message history

Socket.IO is used for the real-time communication layer.

### Interview Feature

Students have access to an interview feature backed by the system's interview session functionality. An optional Anthropic API integration can be configured through the environment settings.

### Security

The backend includes:

- JWT authentication and role-based access control
- Protected document access
- Request validation and sanitization
- Rate limiting
- Helmet security headers
- Upload scanning support
- Security audit logging
- Restricted administrator views

## Setup

### Prerequisites

- Node.js 20
- MongoDB

### Backend

```bash
cd server
cp .env.example .env
npm install
npm run seed:admin
npm run dev
```

The API runs on port `5000` by default.

### Frontend

```bash
cd client
cp .env.example .env
npm install
npm start
```

The React development server runs on port `3000` by default.

Set `REACT_APP_API_URL` in `client/.env` to the backend API URL.

## Environment Configuration

The backend `.env` supports:

- `MONGO_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CLIENT_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `CLAMAV_SCAN`
- `CLAMSCAN_PATH`
- `STORAGE_PROVIDER`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM`
- `ADMIN_SENSITIVE_PIN`
- `ANTHROPIC_API_KEY`
- `AI_MODEL`

`STORAGE_PROVIDER` defaults to `local`. Set it to `cloudinary` when persistent cloud storage is required.

Email is sent through the Resend API using `RESEND_API_KEY` and `RESEND_FROM`.

## Production

The root project includes `railpack.json` with Node.js 20 configuration for deployment environments using Railpack.

For hosts with ephemeral local storage, use Cloudinary:

```env
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

This allows uploaded resumes, documents, avatars, and company logos to remain available after redeployments or restarts.

Do not commit `.env` files or production credentials.

## Available Commands

### Root

```bash
npm run build
npm start
```

### Server

```bash
npm start
npm run dev
npm test
npm run seed:admin
npm run seed:test-accounts
npm run remove:test-accounts
npm run reset:admin-password
npm run seed:jobs
npm run verify:uploaded-logos
```

The test-account commands are intended for development or test environments only.
