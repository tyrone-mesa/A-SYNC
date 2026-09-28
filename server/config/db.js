const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error(
      "MONGO_URI is not set. Configure the Atlas connection string only.",
    );
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: "majority",
      maxPoolSize: 10,
      minPoolSize: 2,
    });

    process.env.MONGO_URI = uri;
    console.log(`[ASIATECH SYNC] MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error(`[ASIATECH SYNC] MongoDB connection failed: ${err.message}`);
    console.error("[ASIATECH SYNC] Please check:");
    console.error("  1. MongoDB Atlas cluster is running");
    console.error(
      "  2. Your IP is whitelisted in MongoDB Atlas Network Access",
    );
    console.error("  3. MONGO_URI credentials are correct");
    console.error("  4. You have internet connectivity");
    throw err;
  }
};

module.exports = connectDB;
