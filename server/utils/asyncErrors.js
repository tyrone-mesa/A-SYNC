// Express 4 does not catch errors thrown inside `async` route handlers. When one of them
// rejects (a bad ObjectId, a dropped DB connection, ...) the request just hangs and Node
// reports an unhandled rejection, which can take the whole server down.
//
// This patches Express's Layer so a rejected promise from any handler is forwarded to
// next(err), i.e. to the app's normal error middleware, exactly like a thrown error.
const Layer = require("express/lib/router/layer");

if (!Layer.prototype.__asyncErrorsPatched) {
  Layer.prototype.handle_request = function handleRequest(req, res, next) {
    const fn = this.handle;
    if (fn.length > 3) return next(); // error-handling middleware: not for normal requests
    try {
      const result = fn(req, res, next);
      if (result && typeof result.catch === "function") result.catch(next);
    } catch (err) {
      next(err);
    }
  };
  Layer.prototype.__asyncErrorsPatched = true;
}

// Last-resort safety net: log instead of crashing the process on a stray rejection.
process.on("unhandledRejection", (reason) => {
  console.error("[ASIATECH SYNC] Unhandled promise rejection:", reason);
});
