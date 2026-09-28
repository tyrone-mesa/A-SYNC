const mongoose = require("mongoose");

const DATABASE_STATUS = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

const registerHealthRoute = (
  app,
  getReadyState = () => mongoose.connection.readyState,
) => {
  app.get("/api/health", (req, res) => {
    const readyState = getReadyState();
    const databaseReady = readyState === 1;

    res.json({
      status: "ok",
      service: "ASIATECH SYNC API",
      readiness: databaseReady ? "ready" : "not_ready",
      database: {
        status: DATABASE_STATUS[readyState] || "unknown",
      },
      timestamp: new Date().toISOString(),
    });
  });
};

module.exports = registerHealthRoute;
