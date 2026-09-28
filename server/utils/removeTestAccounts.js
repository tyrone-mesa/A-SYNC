// Run with: npm run remove:test-accounts [-- --confirm-test-account-removal]
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Application = require("../models/Application");
const AttendanceLog = require("../models/AttendanceLog");
const CompanyProfile = require("../models/CompanyProfile");
const Conversation = require("../models/Conversation");
const InterviewSession = require("../models/InterviewSession");
const Job = require("../models/Job");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const PublicConcern = require("../models/PublicConcern");
const StudentProfile = require("../models/StudentProfile");
const User = require("../models/User");
const { STUDENT_EMAIL_DOMAIN } = require("../config/constants");
const {
  getHistoryModel,
} = require("./messageHistory");
const { removeFile } = require("./storage");

const CONFIRMATION_FLAG = "--confirm-test-account-removal";
const HISTORY_ROLES = ["student", "company", "coordinator", "registrar", "admin"];
const TEST_ACCOUNTS = [
  {
    email: `teststudent@${STUDENT_EMAIL_DOMAIN}`,
    fullName: "Test Student",
    role: "student",
  },
  {
    email: "testcompany@example.com",
    fullName: "Test Company",
    role: "company",
  },
  {
    email: "testcoordinator@example.com",
    fullName: "Test Coordinator",
    role: "coordinator",
  },
  {
    email: "testregistrar@example.com",
    fullName: "Test Registrar",
    role: "registrar",
  },
];

const parseArgs = (args) => {
  const unknownArgs = args.filter((arg) => arg !== CONFIRMATION_FLAG);
  if (unknownArgs.length) {
    throw new Error(`Unsupported argument: ${unknownArgs[0]}`);
  }
  return { confirmed: args.includes(CONFIRMATION_FLAG) };
};

const findRemovalPlan = async () => {
  const accounts = [];

  for (const expected of TEST_ACCOUNTS) {
    const user = await User.findOne({ email: expected.email }).select(
      "_id email fullName role",
    );
    if (user && (user.fullName !== expected.fullName || user.role !== expected.role)) {
      throw new Error(
        `Refusing to remove ${expected.email}: its name or role does not match the seeded test account.`,
      );
    }
    accounts.push(user);
  }

  const users = accounts.filter(Boolean);
  const userIds = users.map(({ _id }) => _id);
  const studentUser = users.find(({ role }) => role === "student");
  const companyUser = users.find(({ role }) => role === "company");
  const studentProfile = studentUser
    ? await StudentProfile.findOne({ user: studentUser._id })
    : null;
  const companyProfile = companyUser
    ? await CompanyProfile.findOne({ user: companyUser._id })
    : null;

  if (studentProfile && studentProfile.studentId !== "TEST-STUDENT") {
    throw new Error(
      "Refusing to remove the student profile: it does not have the test seed's TEST-STUDENT identifier.",
    );
  }
  if (
    companyProfile &&
    (companyProfile.companyName !== "A-Sync Test Company" ||
      companyProfile.contactPerson !== companyUser.fullName)
  ) {
    throw new Error(
      "Refusing to remove the company profile: its name or contact person does not match the test seed.",
    );
  }

  const uploadedFileUrls = [
    ...(studentProfile
      ? [
          studentProfile.resumeUrl,
          studentProfile.transcriptUrl,
          studentProfile.avatarUrl,
          studentProfile.certificateUrl,
        ]
      : []),
    ...(companyProfile ? [companyProfile.companyUploadedLogo] : []),
  ].filter(Boolean);
  const studentProfileIds = studentProfile ? [studentProfile._id] : [];
  const companyProfileIds = companyProfile ? [companyProfile._id] : [];
  const jobs = companyProfile
    ? await Job.find({ company: companyProfile._id }).select("_id")
    : [];
  const jobIds = jobs.map(({ _id }) => _id);
  const applicationFilter = {
    $or: [
      ...(studentProfileIds.length ? [{ student: { $in: studentProfileIds } }] : []),
      ...(companyProfileIds.length ? [{ company: { $in: companyProfileIds } }] : []),
      ...(jobIds.length ? [{ job: { $in: jobIds } }] : []),
    ],
  };
  const applications = applicationFilter.$or.length
    ? await Application.find(applicationFilter).select("_id")
    : [];
  const concernFilter = {
    $or: [
      ...(userIds.length ? [{ submitter: { $in: userIds } }] : []),
      { email: { $in: TEST_ACCOUNTS.map(({ email }) => email) } },
    ],
  };
  const submittedConcerns = await PublicConcern.find(concernFilter).select(
    "_id",
  );
  const conversations = userIds.length
    ? await Conversation.find({ participants: { $in: userIds } }).select("_id")
    : [];
  const conversationIds = conversations.map(({ _id }) => _id);

  const historyModels = HISTORY_ROLES.map(getHistoryModel);
  const historyCounts = await Promise.all(
    historyModels.map(async (History) => {
      const clauses = [];
      if (userIds.length) {
        clauses.push(
          { ownerUser: { $in: userIds } },
          { sender: { $in: userIds } },
        );
      }
      if (conversationIds.length) {
        clauses.push({ conversation: { $in: conversationIds } });
      }
      return clauses.length ? History.countDocuments({ $or: clauses }) : 0;
    }),
  );

  const countFor = async (Model, filter) =>
    filter ? Model.countDocuments(filter) : 0;
  const plan = {
    accounts: users.length,
    studentProfiles: studentProfileIds.length,
    companyProfiles: companyProfileIds.length,
    jobs: jobs.length,
    applications: applications.length,
    attendanceLogs: await countFor(
      AttendanceLog,
      studentProfileIds.length || companyProfileIds.length
        ? {
            $or: [
              ...(studentProfileIds.length
                ? [{ student: { $in: studentProfileIds } }]
                : []),
              ...(companyProfileIds.length
                ? [{ company: { $in: companyProfileIds } }]
                : []),
            ],
          }
        : null,
    ),
    interviewSessions: await countFor(
      InterviewSession,
      studentProfileIds.length
        ? { student: { $in: studentProfileIds } }
        : null,
    ),
    conversations: conversations.length,
    messages: await countFor(
      Message,
      userIds.length || conversationIds.length
        ? {
            $or: [
              ...(userIds.length ? [{ sender: { $in: userIds } }] : []),
              ...(conversationIds.length
                ? [{ conversation: { $in: conversationIds } }]
                : []),
            ],
          }
        : null,
    ),
    messageHistory: historyCounts.reduce((total, count) => total + count, 0),
    notifications: await countFor(
      Notification,
      userIds.length || submittedConcerns.length
        ? {
            $or: [
              ...(userIds.length ? [{ recipient: { $in: userIds } }] : []),
              ...(submittedConcerns.length
                ? [
                    {
                      link: {
                        $in: submittedConcerns.map(
                          ({ _id }) =>
                            `/messages?view=concerns&concernId=${_id}`,
                        ),
                      },
                    },
                  ]
                : []),
            ],
          }
        : null,
    ),
    submittedConcerns: await countFor(
      PublicConcern,
      concernFilter,
    ),
    uploadedFiles: new Set(uploadedFileUrls).size,
  };

  return {
    users,
    userIds,
    studentProfileIds,
    companyProfileIds,
    jobIds,
    conversationIds,
    submittedConcernIds: submittedConcerns.map(({ _id }) => _id),
    uploadedFileUrls: [...new Set(uploadedFileUrls)],
    historyModels,
    plan,
  };
};

const removeTestAccounts = async (plan) => {
  const {
    userIds,
    studentProfileIds,
    companyProfileIds,
    jobIds,
    conversationIds,
    submittedConcernIds,
    uploadedFileUrls,
    historyModels,
  } = plan;
  const result = {};

  const removeMany = async (name, Model, filter) => {
    if (!filter) {
      result[name] = 0;
      return;
    }
    const deleted = await Model.deleteMany(filter);
    result[name] = deleted.deletedCount;
  };

  const applicationClauses = [
    ...(studentProfileIds.length
      ? [{ student: { $in: studentProfileIds } }]
      : []),
    ...(companyProfileIds.length
      ? [{ company: { $in: companyProfileIds } }]
      : []),
    ...(jobIds.length ? [{ job: { $in: jobIds } }] : []),
  ];
  await removeMany(
    "applications",
    Application,
    applicationClauses.length ? { $or: applicationClauses } : null,
  );
  await removeMany(
    "attendance logs",
    AttendanceLog,
    studentProfileIds.length || companyProfileIds.length
      ? {
          $or: [
            ...(studentProfileIds.length
              ? [{ student: { $in: studentProfileIds } }]
              : []),
            ...(companyProfileIds.length
              ? [{ company: { $in: companyProfileIds } }]
              : []),
          ],
        }
      : null,
  );
  await removeMany(
    "interview sessions",
    InterviewSession,
    studentProfileIds.length ? { student: { $in: studentProfileIds } } : null,
  );
  const concernIds = submittedConcernIds || [];
  await removeMany(
    "notifications",
    Notification,
    userIds.length || concernIds.length
      ? {
          $or: [
            ...(userIds.length ? [{ recipient: { $in: userIds } }] : []),
            ...(concernIds.length
              ? [
                  {
                    link: {
                      $in: concernIds.map(
                        (id) => `/messages?view=concerns&concernId=${id}`,
                      ),
                    },
                  },
                ]
              : []),
          ],
        }
      : null,
  );
  await removeMany(
    "submitted concerns",
    PublicConcern,
    userIds.length ? { submitter: { $in: userIds } } : null,
  );
  if (userIds.length) {
    await PublicConcern.updateMany(
      {
        $or: [
          { "replies.author": { $in: userIds } },
          { readBy: { $in: userIds } },
        ],
      },
      {
        $pull: {
          replies: { author: { $in: userIds } },
          readBy: { $in: userIds },
        },
      },
    );
    await PublicConcern.updateMany(
      { repliedBy: { $in: userIds } },
      { $unset: { repliedBy: 1, reply: 1, repliedAt: 1 } },
    );
  }
  for (let index = 0; index < historyModels.length; index += 1) {
    const clauses = [];
    if (userIds.length) {
      clauses.push(
        { ownerUser: { $in: userIds } },
        { sender: { $in: userIds } },
      );
    }
    if (conversationIds.length) {
      clauses.push({ conversation: { $in: conversationIds } });
    }
    await removeMany(
      `message history (${HISTORY_ROLES[index]})`,
      historyModels[index],
      clauses.length ? { $or: clauses } : null,
    );
  }
  await removeMany(
    "messages",
    Message,
    userIds.length || conversationIds.length
      ? {
          $or: [
            ...(userIds.length ? [{ sender: { $in: userIds } }] : []),
            ...(conversationIds.length
              ? [{ conversation: { $in: conversationIds } }]
              : []),
          ],
        }
      : null,
  );
  await removeMany(
    "conversations",
    Conversation,
    userIds.length ? { participants: { $in: userIds } } : null,
  );
  await removeMany(
    "jobs",
    Job,
    companyProfileIds.length ? { company: { $in: companyProfileIds } } : null,
  );
  let removedFiles = 0;
  for (const fileUrl of uploadedFileUrls || []) {
    const removed = await removeFile(fileUrl);
    if (!removed) {
      throw new Error(
        `Failed to remove test-account upload ${fileUrl}; database profile records were retained where possible.`,
      );
    }
    removedFiles += 1;
  }
  result["uploaded files"] = removedFiles;
  await removeMany(
    "student profiles",
    StudentProfile,
    studentProfileIds.length ? { _id: { $in: studentProfileIds } } : null,
  );
  await removeMany(
    "company profiles",
    CompanyProfile,
    companyProfileIds.length ? { _id: { $in: companyProfileIds } } : null,
  );
  await removeMany(
    "users",
    User,
    userIds.length ? { _id: { $in: userIds } } : null,
  );

  return result;
};

const printPlan = (plan) => {
  console.log("[ASIATECH SYNC] Test-account removal plan:");
  for (const [name, count] of Object.entries(plan.plan)) {
    console.log(`  ${name}: ${count}`);
  }
};

if (require.main === module) {
  (async () => {
    const { confirmed } = parseArgs(process.argv.slice(2));
    if (!["development", "test"].includes(process.env.NODE_ENV)) {
      throw new Error(
        "Test accounts may only be removed when NODE_ENV is explicitly set to development or test.",
      );
    }

    await connectDB();
    try {
      const plan = await findRemovalPlan();
      printPlan(plan);
      if (!confirmed) {
        console.log(
          `[ASIATECH SYNC] Dry run only. Re-run with ${CONFIRMATION_FLAG} to remove these accounts and their linked test data.`,
        );
        return;
      }

      const result = await removeTestAccounts(plan);
      console.log("[ASIATECH SYNC] Test accounts and linked records removed:");
      for (const [name, count] of Object.entries(result)) {
        console.log(`  ${name}: ${count}`);
      }
    } finally {
      await mongoose.connection.close();
    }
  })().catch((error) => {
    console.error("[ASIATECH SYNC] Test account removal failed:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { findRemovalPlan, parseArgs, removeTestAccounts };
