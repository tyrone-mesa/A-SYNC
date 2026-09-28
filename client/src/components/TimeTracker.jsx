import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../api/axios";

const phTime = (date) =>
  new Date(date).toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
  });

const phDate = (date) =>
  new Date(date).toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatElapsed = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
};

// Records OJT attendance. Time In / Time Out are captured automatically — the student never
// types a date or time — using Philippine Standard Time on the server. Time Out hours are
// added straight to the student's completed OJT hour total.
const TimeTracker = () => {
  const [openLog, setOpenLog] = useState(null);
  const [logs, setLogs] = useState([]);
  const [completedOJTHours, setCompletedOJTHours] = useState(0);
  const [requiredOJTHours, setRequiredOJTHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/students/me/attendance")
      .then(({ data }) => {
        const nextOpenLog =
          data.openLog &&
          data.openLog.status === "open" &&
          !data.openLog.timeOut
            ? data.openLog
            : null;

        setOpenLog(nextOpenLog);
        setLogs(data.logs || []);
        setCompletedOJTHours(data.completedOJTHours || 0);
        setRequiredOJTHours(data.requiredOJTHours || 0);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    const refreshTimer = setInterval(() => {
      load();
    }, 5000);

    return () => clearInterval(refreshTimer);
  }, [load]);

  useEffect(() => {
    if (openLog) {
      tickRef.current = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(tickRef.current);
    }
    return undefined;
  }, [openLog]);

  const progressPct =
    requiredOJTHours > 0
      ? Math.min(100, Math.round((completedOJTHours / requiredOJTHours) * 100))
      : 0;

  return (
    <div className="card p-6 mb-10">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="font-display font-semibold text-navy">
            OJT Attendance
          </h2>
          <p className="text-navy/65 text-sm">
            Company-managed attendance. Your recorded hours are updated by your
            company.
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-forest/30 bg-forest/10 px-4 py-3 text-sm text-[#5E7867]">
        Attendance is recorded only by the company during your OJT schedule.
      </div>

      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-navy/65">Goal Progress</span>
        <span className="text-navy/65">
          {completedOJTHours} / {requiredOJTHours} hours
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-navy/10 overflow-hidden mb-6">
        <div
          className="h-full bg-forest rounded-full transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <h3 className="text-navy/70 text-sm font-medium mb-2">Recent Logs</h3>
      <div className="divide-y divide-black/10 rounded-lg border border-black/10 overflow-hidden">
        {logs.length === 0 && (
          <div className="p-4 text-center text-navy/65 text-sm">
            No completed logs yet.
          </div>
        )}
        {logs.slice(0, 5).map((log) => (
          <div
            key={log._id}
            className="p-3 flex items-center justify-between gap-3 text-sm"
          >
            <span className="text-navy/70">{phDate(log.timeIn)}</span>
            <span className="text-navy/65">
              {phTime(log.timeIn)} – {log.timeOut ? phTime(log.timeOut) : "—"}
            </span>
            <span className="text-[#5E7867] font-medium shrink-0">
              {log.hoursLogged} hrs
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimeTracker;
