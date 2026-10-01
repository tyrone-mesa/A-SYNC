const assert = require("node:assert/strict");
const { after, before, describe, it, mock } = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const Application = require("../models/Application");
const CompanyProfile = require("../models/CompanyProfile");
const StudentProfile = require("../models/StudentProfile");
const User = require("../models/User");
const registerHealthRoute = require("../utils/health");
const { buildArchivePdf } = require("../utils/archivePdf");
const studentRoutes = require("../routes/studentRoutes");

process.env.JWT_SECRET = "integration-test-secret-with-at-least-32-characters";

const ids = {
  company: "64b000000000000000000001",
  student: "64b000000000000000000002",
  profile: "64b000000000000000000003",
  companyProfile: "64b000000000000000000004",
  unlinkedCompany: "64b000000000000000000005",
};

const users = {
  [ids.company]: {
    _id: ids.company,
    role: "company",
    isActive: true,
    isArchived: false,
  },
  [ids.student]: {
    _id: ids.student,
    role: "student",
    isActive: true,
    isArchived: false,
  },
  [ids.unlinkedCompany]: {
    _id: ids.unlinkedCompany,
    role: "company",
    isActive: true,
    isArchived: false,
  },
};

const profile = {
  _id: ids.profile,
  course: "Information Technology",
  skills: ["JavaScript"],
  user: {
    fullName: "Test Student",
    email: "student@example.test",
  },
};

let server;
let baseUrl;
let databaseReadyState = 0;

const tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET);

const get = async (url, token) =>
  fetch(`${baseUrl}${url}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

describe("server integration protections", { concurrency: false }, () => {
  before(async () => {
    mock.method(User, "findById", async (id) => users[id] || null);
    mock.method(StudentProfile, "findById", () => ({
      populate: async () => profile,
    }));
    mock.method(CompanyProfile, "findOne", ({ user }) => ({
      select: async () =>
        user === ids.unlinkedCompany ? null : { _id: ids.companyProfile },
    }));
    mock.method(Application, "exists", async () => false);

    const app = express();
    registerHealthRoute(app, () => databaseReadyState);
    app.use("/api/students", studentRoutes);
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
    mock.restoreAll();
  });

  it("reports database readiness without changing the health endpoint's liveness status", async () => {
    for (const [readyState, expectedStatus, expectedReadiness] of [
      [0, "disconnected", "not_ready"],
      [2, "connecting", "not_ready"],
      [1, "connected", "ready"],
    ]) {
      databaseReadyState = readyState;
      const response = await get("/api/health");
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.status, "ok");
      assert.equal(body.database.status, expectedStatus);
      assert.equal(body.readiness, expectedReadiness);
    }
  });

  it("generates a PDF archive report for archived account data", async () => {
    const pdf = await buildArchivePdf({
      user: {
        fullName: "Archived Test User",
        email: "archived@example.test",
        role: "company",
        isActive: false,
        isArchived: true,
        archivedAt: new Date("2026-09-27T00:00:00.000Z"),
      },
      companyProfile: { companyName: "Test Company" },
      jobs: [{ title: "Test role", status: "archived" }],
      applications: [],
      attendance: [],
      conversations: [],
      messages: [],
    });

    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    assert.ok(pdf.length > 500);
  });

  it("rejects requests without authentication and blocks students from company profile routes", async () => {
    const unauthenticated = await get(`/api/students/${ids.profile}`);
    const studentRequest = await get(
      `/api/students/${ids.profile}`,
      tokenFor(ids.student)
    );

    assert.equal(unauthenticated.status, 401);
    assert.equal(studentRequest.status, 403);
  });

  it("denies a company access to a student profile and export without an application", async () => {
    const token = tokenFor(ids.company);
    const profileResponse = await get(`/api/students/${ids.profile}`, token);
    const exportResponse = await get(
      `/api/students/${ids.profile}/export/csv`,
      token
    );

    assert.equal(profileResponse.status, 404);
    assert.equal(exportResponse.status, 404);
  });

  it("denies a company account that has no linked company profile", async () => {
    const token = tokenFor(ids.unlinkedCompany);
    const response = await get(`/api/students/${ids.profile}`, token);

    assert.equal(response.status, 404);
  });

  it("allows a company with an application to view and export the applicant profile", async () => {
    Application.exists.mock.mockImplementation(async () => true);

    const token = tokenFor(ids.company);
    const profileResponse = await get(`/api/students/${ids.profile}`, token);
    const profileBody = await profileResponse.json();
    const exportResponse = await get(
      `/api/students/${ids.profile}/export/csv`,
      token
    );
    const csv = await exportResponse.text();

    assert.equal(profileResponse.status, 200);
    assert.equal(profileBody.profile._id, ids.profile);
    assert.equal(exportResponse.status, 200);
    assert.match(csv, /student@example\.test/);
  });
});
