const mongoose = require("mongoose");
const MessageHistorySchema = require("../models/MessageHistory");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");

const ROLES = ["student", "company", "coordinator", "registrar", "admin"];
const COLLECTIONS = Object.fromEntries(
  ROLES.map((role) => [role, `${role}_message_history`]),
);

const getHistoryModel = (role) => {
  if (!ROLES.includes(role)) return null;
  const collectionName = COLLECTIONS[role];
  return (
    mongoose.connection.models[`MessageHistory_${role}`] ||
    mongoose.connection.model(
      `MessageHistory_${role}`,
      MessageHistorySchema,
      collectionName,
    )
  );
};

const ensureMessageHistoryCollections = async () => {
  const db = mongoose.connection.db;
  for (const role of ROLES) {
    const collectionName = COLLECTIONS[role];
    try {
      await db.createCollection(collectionName);
    } catch (error) {
      if (error.codeName !== "NamespaceExists") throw error;
    }
    await getHistoryModel(role).createIndexes();
  }
};

const archiveMessage = async (message, conversation) => {
  const participants = await User.find({
    _id: { $in: conversation.participants },
    role: { $in: ROLES },
  }).select("_id role");

  await Promise.all(
    participants.map((participant) => {
      const History = getHistoryModel(participant.role);
      return History.updateOne(
        { sourceMessage: message._id, ownerUser: participant._id },
        {
          $setOnInsert: {
            sourceMessage: message._id,
            conversation: conversation._id,
            ownerUser: participant._id,
            ownerRole: participant.role,
            sender: message.sender,
            body: message.body,
            sentAt: message.createdAt,
            readAt: message.readAt,
          },
        },
        { upsert: true },
      );
    }),
  );
};

const backfillMessageHistory = async () => {
  let archived = 0;
  const cursor = Message.find().sort({ createdAt: 1 }).cursor();

  for await (const message of cursor) {
    const conversation = await Conversation.findById(
      message.conversation,
    ).select("participants");
    if (!conversation) continue;
    await archiveMessage(message, conversation);
    archived += 1;
  }

  return archived;
};

module.exports = {
  COLLECTIONS,
  getHistoryModel,
  ensureMessageHistoryCollections,
  archiveMessage,
  backfillMessageHistory,
};
