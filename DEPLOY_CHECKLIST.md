# ASIATECH SYNC — Deploy Checklist

## What changed in this pass

**Persistence fix (the big one).** Uploaded files (resumes, transcripts, avatars,
certificates, company logos) were stored on local disk, which most PaaS hosts (Render,
Railway, Heroku) wipe on every redeploy/restart. Added a storage abstraction
(`server/utils/storage.js`, `server/utils/persistUpload.js`) that supports:

- `STORAGE_PROVIDER=local` (default) — unchanged behavior, fine on hosts with real
  persistent disk.
- `STORAGE_PROVIDER=cloudinary` — uploads go to Cloudinary instead. Every existing
  `/uploads/<filename>` URL, DB field, and access-control check keeps working untouched;
  only the storage location changes. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
  and `CLOUDINARY_API_SECRET` in your `.env` to enable it, and run `npm install` in
  `server/` to pull in the `cloudinary` package (added to `package.json`).

Also fixed: `seedCompanyUploadedLogos.js` used to run `fs.existsSync()` against every
stored logo path on every server boot regardless of provider — on an ephemeral-disk host
that meant every restart wiped `companyUploadedLogo` for logos that were actually fine
(the local disk had been wiped, not the logo). It now skips that check for remote URLs.

**ClamAV.** Previously defaulted to **on** (`CLAMAV_SCAN` forced to `"true"` if unset), so
on any host without the `clamscan` binary installed, every single upload got hard-rejected
with a 503. Now defaults to **off**. Signature/magic-byte file-type validation in
`middleware/scanUpload.js` still runs unconditionally either way — turning ClamAV off does
not disable file-type validation, only the extra antivirus binary scan.

**Legal pages.** Added Privacy Policy, Terms & Conditions, and Cookies Policy pages
(`client/src/pages/PrivacyPolicy.jsx`, `TermsAndConditions.jsx`, `CookiesPolicy.jsx`),
linked from both footers, plus required consent checkboxes on company registration
(`Register.jsx`) and the homepage "Send a Concern" form (`LandingPage.jsx`).

> The legal page content is a starting template, not legal advice. Given the volume of
> student personal data this platform processes, have your school's data-protection
> officer or legal counsel review it against the Philippine Data Privacy Act (RA 10173)
> before go-live.

**Production env sanity checks.** `server.js` now warns on boot (not a hard stop) if
`NODE_ENV=production` but `CLIENT_URL` still looks like localhost, or if
`STORAGE_PROVIDER` isn't set to `cloudinary` in production.

## Deploying to Render

The repository includes a Render Blueprint at `render.yaml`. It builds the React
frontend and serves it from the Express API service, so the app and `/api` share one
origin. React routes fall back to `index.html`, and `/api/health` is the service health
check.

1. Push this repository to a Git provider and create a new Blueprint from it in the
   [Render Dashboard](https://dashboard.render.com/blueprints).
2. Enter the requested secrets and configuration values when prompted:
   - `MONGO_URI`: MongoDB Atlas connection string. Allow the Render service to connect in
     Atlas Network Access.
   - `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` (at least 12 characters, including
     uppercase, lowercase, a number, and a symbol). The server creates or updates this
     admin account on startup.
   - Cloudinary credentials for durable uploaded-file storage.
   - `RESEND_API_KEY` and `RESEND_FROM` for OTP, password-reset, and notification email.
     Verify the sender domain with Resend before sending to real users.
3. Render generates `JWT_SECRET` and `ADMIN_SENSITIVE_PIN` automatically. Keep both
   private; the latter is needed for restricted admin views.
4. Wait for the first deploy to finish, then open the service URL. Check `/api/health`
   reports `"readiness": "ready"` before using the app.
5. Review the legal pages with the school's data-protection officer or counsel before
   collecting student information.

This Blueprint uses Render's free web-service plan. Free instances can spin down when
idle; choose a paid plan in Render for a production service that needs to stay available.
Uploaded files are stored in Cloudinary because Render's local filesystem is ephemeral.

The Blueprint only references secret names, not their values. Never add `.env` files,
database URLs, API keys, or passwords to the repository.

## Before you deploy — things only you can do

1. **Rotate three credentials that were exposed in a shared `.env` file:**
   - MongoDB Atlas password for the `adminsync` user (rotate in the Atlas dashboard)
   - Gmail app password used for `SMTP_PASS` (regenerate in your Google account's app
     passwords page)
   - `ADMIN_PASSWORD` in `.env` — this one's trivial: just change it and restart the
     server, since `seedAdmin.js` re-hashes it from `.env` on every boot.
   - **This zip does not include your real `.env`** — only `.env.example` — specifically
     so the old burned credentials don't get redistributed. Copy `.env.example` to `.env`
     and fill in your rotated values.

2. **For Render, keep `REACT_APP_API_URL=/api`** as defined in `render.yaml`. If you later
   host the frontend separately, set `CLIENT_URL` on the API and set `REACT_APP_API_URL`
   before building the client; React bakes that value in at build time.

3. **Set `NODE_ENV=production`** on your host.
   Sample job listings and demo company accounts are seeded automatically only outside
   production; production startup will not create demo marketplace data.

4. **Decide on `STORAGE_PROVIDER`.** If your host doesn't guarantee persistent disk
   (check their docs — most free/hobby tiers don't), set `STORAGE_PROVIDER=cloudinary` and
   create a free Cloudinary account for the three `CLOUDINARY_*` values.

5. **Confirm MongoDB Atlas Network Access** allows your host's IP (or `0.0.0.0/0` if your
   host uses dynamic IPs).

## Still open (not code-breaking, but worth knowing about)

- Hero video's license/source is still unconfirmed.
- Testimonials on the landing page are placeholder/fake — left alone since they're used
  for the demo.
