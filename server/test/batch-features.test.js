const assert = require("node:assert/strict");
const { after, before, describe, it, mock } = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "integration-test-secret-with-at-least-32-characters";

const Application = require("../models/Application");
const CompanyProfile = require("../models/CompanyProfile");
const Evaluation = require("../models/Evaluation");
const JournalEntry = require("../models/JournalEntry");
const StudentProfile = require("../models/StudentProfile");
const User = require("../models/User");

const journalRoutes = require("../routes/journalRoutes");
const evaluationRoutes = require("../routes/evaluationRoutes");
const completionRoutes = require("../routes/completionRoutes");
const adminRoutes = require("../routes/adminRoutes");

const ids = {
  student: "64b000000000000000000101",
  company: "64b000000000000000000102",
  admin: "64b000000000000000000103",
  readOnlyAdmin: "64b000000000000000000104",
  coordinator: "64b000000000000000000105",
  otherStudent: "64b000000000000000000106",
  companyProfile: "64b000000000000000000107",
  studentProfile: "64b000000000000000000108",
};

const roleOf = {
  [ids.student]: { role: "student", isActive: true },
  [ids.company]: { role: "company", isActive: true },
  [ids.admin]: { role: "admin", adminType: "full", isActive: true },
  [ids.readOnlyAdmin]: { role: "admin", adminType: "read-only", isActive: true },
  [ids.coordinator]: { role: "coordinator", isActive: true },
  [ids.otherStudent]: { role: "student", isActive: true },
};

const tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET);
const jsonHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

let server;
let baseUrl;

describe("batch 3-6 workflow protections", { concurrency: false }, () => {
  before(async () => {
    mock.method(User, "findById", async (id) => roleOf[id] || null);
    mock.method(CompanyProfile, "findOne", async () => ({
      _id: ids.companyProfile,
    }));
    mock.method(Application, "exists", async () => false);
    mock.method(JournalEntry, "exists", async () => false);
    mock.method(Evaluation, "exists", async () => false);

    const app = express();
    app.use(express.json());
    app.use("/api/journals", journalRoutes);
    app.use("/api/evaluations", evaluationRoutes);
    app.use("/api/completion", completionRoutes);
    app.use("/api/admin", adminRoutes);
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    mock.restoreAll();
  });

  // ---------- Batch 4: journal permissions ----------
  it("blocks students from reading another student's journal", async () => {
    const response = await fetch(
      `${baseUrl}/api/journals/of-student/${ids.otherStudent}`,
      { headers: { Authorization: `Bearer ${tokenFor(ids.student)}` } },
    );
    assert.equal(response.status, 403);
  });

  it("blocks companies without an approved application from a student's journal", async () => {
    const response = await fetch(
      `${baseUrl}/api/journals/of-student/${ids.studentProfile}`,
      { headers: { Authorization: `Bearer ${tokenFor(ids.company)}` } },
    );
    assert.equal(response.status, 403);
  });

  it("rejects journal entries without activities", async () => {
    const response = await fetch(`${baseUrl}/api/journals`, {
      method: "POST",
      headers: jsonHeaders(tokenFor(ids.student)),
      body: JSON.stringify({
        entryDate: new Date().toISOString(),
        activities: "",
        status: "submitted",
      }),
    });
    assert.equal(response.status, 400);
  });

  // ---------- Batch 5: evaluation one-final rule ----------
  it("rejects out-of-range evaluation ratings", async () => {
    const response = await fetch(`${baseUrl}/api/evaluations`, {
      method: "POST",
      headers: jsonHeaders(tokenFor(ids.company)),
      body: JSON.stringify({
        studentId: ids.studentProfile,
        ratings: {
          workQuality: 9,
          productivity: 3,
          communication: 3,
          punctuality: 3,
          teamwork: 3,
          initiative: 3,
        },
        recommendation: "recommend",
        status: "draft",
      }),
    });
    assert.equal(response.status, 400);
  });

  it("enforces a single final evaluation per trainee", async (t) => {
    mock.method(Application, "exists", async () => true);
    t.after(() => {
      mock.method(Application, "exists", async () => false);
    });

    const body = {
      studentId: ids.studentProfile,
      ratings: {
        workQuality: 4,
        productivity: 4,
        communication: 4,
        punctuality: 4,
        teamwork: 4,
        initiative: 4,
      },
      recommendation: "recommend",
      status: "final",
    };

    mock.method(Evaluation, "exists", async () => false);
    mock.method(Evaluation, "create", async (payload) => ({
      _id: "eval-1",
      ...payload,
    }));
    mock.method(StudentProfile, "findById", async () => ({ user: null }));
    const first = await fetch(`${baseUrl}/api/evaluations`, {
      method: "POST",
      headers: jsonHeaders(tokenFor(ids.company)),
      body: JSON.stringify(body),
    });
    assert.equal(first.status, 201);

    mock.method(Evaluation, "exists", async () => true);
    const second = await fetch(`${baseUrl}/api/evaluations`, {
      method: "POST",
      headers: jsonHeaders(tokenFor(ids.company)),
      body: JSON.stringify(body),
    });
    assert.equal(second.status, 400);
    const payload = await second.json();
    assert.match(payload.message, /final evaluation already exists/i);
  });

  // ---------- Batch 6: completion verification ----------
  it("refuses completion verification while requirements are unmet", async () => {
    mock.method(StudentProfile, "findById", async () => ({
      _id: ids.studentProfile,
      user: null,
      isProfileComplete: true,
      resumeStatus: "approved",
      transcriptStatus: "approved",
      completedOJTHours: 480,
      requiredOJTHours: 480,
      ojtCompletionVerified: false,
      save: async () => {},
    }));

    const response = await fetch(
      `${baseUrl}/api/completion/verify/${ids.studentProfile}`,
      { method: "PUT", headers: jsonHeaders(tokenFor(ids.admin)) },
    );
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.match(payload.message, /cannot verify yet/i);
  });

  it("blocks read-only admins from completion verification", async () => {
    const response = await fetch(
      `${baseUrl}/api/completion/verify/${ids.studentProfile}`,
      { method: "PUT", headers: jsonHeaders(tokenFor(ids.readOnlyAdmin)) },
    );
    assert.equal(response.status, 403);
  });

  // ---------- Batch 3 + 9: document review + coordinator assignment guards ----------
  it("blocks read-only admins from document review", async () => {
    const response = await fetch(
      `${baseUrl}/api/admin/students/${ids.studentProfile}/documents/resume/review`,
      {
        method: "PUT",
        headers: jsonHeaders(tokenFor(ids.readOnlyAdmin)),
        body: JSON.stringify({ action: "approve" }),
      },
    );
    assert.equal(response.status, 403);
  });

  it("blocks read-only admins from coordinator assignment", async () => {
    const response = await fetch(
      `${baseUrl}/api/admin/students/${ids.studentProfile}/assign-coordinator`,
      {
        method: "PUT",
        headers: jsonHeaders(tokenFor(ids.readOnlyAdmin)),
        body: JSON.stringify({ coordinatorId: ids.coordinator }),
      },
    );
    assert.equal(response.status, 403);
  });

  it("lets coordinators read completion status of a student", async () => {
    mock.method(Evaluation, "exists", async () => false);
    mock.method(StudentProfile, "findById", async () => ({
      _id: ids.studentProfile,
      isProfileComplete: false,
      resumeStatus: "none",
      transcriptStatus: "none",
      completedOJTHours: 0,
      requiredOJTHours: 480,
      ojtCompletionVerified: false,
    }));
    const response = await fetch(
      `${baseUrl}/api/completion/of-student/${ids.studentProfile}`,
      { headers: { Authorization: `Bearer ${tokenFor(ids.coordinator)}` } },
    );
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.state, "in_progress");
    assert.equal(payload.percentage, 0);
  });
});
