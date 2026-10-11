import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axios";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";
import StatusBadge from "../../components/StatusBadge";
import { downloadExport } from "../../utils/download";

const ManageStudentAttendance = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState({});
  const [loadingAttendance, setLoadingAttendance] = useState({});
  const [actionInProgress, setActionInProgress] = useState(null);
  const [exportingDtr, setExportingDtr] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [assessmentForms, setAssessmentForms] = useState({});
  const [submittingAssessment, setSubmittingAssessment] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get("/companies/ojt-students/current");
      const studentList = res.data.students || [];
      setStudents(studentList);
      setMessage({ type: "", text: "" });

      await Promise.all(
        studentList.map((student) => fetchAttendanceHistory(student.studentId)),
      );
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to load students.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceHistory = async (studentId) => {
    if (attendanceHistory[studentId]) {
      return; // Already loaded
    }

    try {
      setLoadingAttendance((prev) => ({ ...prev, [studentId]: true }));
      const res = await api.get(`/companies/attendance/student/${studentId}`);
      setAttendanceHistory((prev) => ({
        ...prev,
        [studentId]: res.data.attendanceRecords || [],
      }));
    } catch (err) {
      setMessage({
        type: "error",
        text: "Failed to load attendance history.",
      });
    } finally {
      setLoadingAttendance((prev) => ({ ...prev, [studentId]: false }));
    }
  };

  const handleTimeIn = async (studentId) => {
    try {
      setActionInProgress(studentId);
      const res = await api.post("/companies/attendance/time-in", {
        studentId,
      });

      const newRecord = res.data.attendance;
      setAttendanceHistory((prev) => ({
        ...prev,
        [studentId]: [newRecord, ...(prev[studentId] || [])],
      }));

      setMessage({
        type: "success",
        text: `Time in recorded for ${res.data.attendance.student?.fullName || "student"}.`,
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to record time in.",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleTimeOut = async (attendanceId, studentId) => {
    try {
      setActionInProgress(attendanceId);
      const res = await api.post("/companies/attendance/time-out", {
        attendanceId,
      });

      const updatedRecord = res.data.attendance;
      setAttendanceHistory((prev) => ({
        ...prev,
        [studentId]: (prev[studentId] || []).map((record) =>
          record._id === attendanceId ? updatedRecord : record,
        ),
      }));

      setStudents((prev) =>
        prev.map((student) =>
          student.studentId === studentId
            ? {
                ...student,
                completedOJTHours:
                  (student.completedOJTHours || 0) +
                  (res.data.hoursLogged || 0),
              }
            : student,
        ),
      );

      setMessage({
        type: "success",
        text: `Time out recorded. Hours logged: ${res.data.hoursLogged}`,
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to record time out.",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDtrExport = async (student, format) => {
    const exportKey = `${student.studentId}-${format}`;
    try {
      setExportingDtr(exportKey);
      const fileName = `${student.fullName.replace(/[^a-z0-9]+/gi, "_")}_DTR.${format}`;
      await downloadExport(
        `/companies/attendance/student/${student.studentId}/export/${format}`,
        fileName,
      );
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to export the DTR.",
      });
    } finally {
      setExportingDtr(null);
    }
  };

  const handleAssessment = async (event, student) => {
    event.preventDefault();
    const form = assessmentForms[student.studentId] || {};
    const data = new FormData();
    data.append("performanceGrade", form.performanceGrade || "");
    data.append("evaluation", form.evaluation || "");
    data.append("certificate", form.certificate);
    try {
      setSubmittingAssessment(student.studentId);
      await api.post(
        `/companies/students/${student.studentId}/assessment`,
        data,
      );
      setMessage({ type: "success", text: "Assessment submitted and locked." });
      fetchStudents();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to submit assessment.",
      });
    } finally {
      setSubmittingAssessment(null);
    }
  };

  const toggleExpandStudent = (studentId) => {
    if (expandedStudent === studentId) {
      setExpandedStudent(null);
    } else {
      setExpandedStudent(studentId);
      fetchAttendanceHistory(studentId);
    }
  };

  const getOpenAttendanceRecord = (studentId) => {
    const records = attendanceHistory[studentId] || [];
    return records.find((r) => r.status === "open");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    // dateString is in YYYY-MM-DD format
    return new Date(dateString + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateObj) => {
    if (!dateObj) return "N/A";
    return new Date(dateObj).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  if (loading) return <DashboardLoading role="company" />;

  return (
    <DashboardShell
      role="company"
      title="Student Attendance"
      subtitle="Manage OJT student time-in and time-out"
    >
      {message.text && (
        <div
          className={`mb-6 rounded-lg p-4 ${
            message.type === "success"
              ? "border border-green-200 bg-green-50 text-green-800"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {students.length === 0 ? (
        <div className="rounded-2xl border border-black/5 bg-[#f8faf8] p-8 text-center text-navy/65">
          No students currently on OJT with your company.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-black/5 bg-[#f8faf8] p-4 shadow-sm">
            <p className="text-sm font-semibold text-navy mb-4">
              {students.length} Student{students.length !== 1 ? "s" : ""} on OJT
            </p>

            <div className="divide-y divide-black/10">
              {students.map((student) => {
                const openRecord = getOpenAttendanceRecord(student.studentId);
                const isExpanded = expandedStudent === student.studentId;
                const records = attendanceHistory[student.studentId] || [];

                return (
                  <div
                    key={student.studentId}
                    className="border-b border-black/10 py-4 last:border-b-0"
                  >
                    {/* Student Summary Row */}
                    <div
                      className="cursor-pointer flex items-center justify-between hover:bg-black/2 p-2 rounded"
                      onClick={() => toggleExpandStudent(student.studentId)}
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#5E7867]">
                          {student.fullName}
                        </h3>
                        <div className="text-sm text-navy/65 mt-1">
                          <p>{student.jobTitle}</p>
                          <p>
                            {student.email} • {student.phone}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1">
                              <div className="flex justify-between mb-1">
                                <span className="text-xs font-medium">
                                  OJT Hours Progress
                                </span>
                                <span className="text-xs font-semibold text-[#5E7867]">
                                  {student.completedOJTHours || 0}/
                                  {student.requiredOJTHours || 0}h
                                </span>
                              </div>
                              <div className="w-full bg-[#dfe8e0] rounded-full h-2">
                                <div
                                  className="h-2 rounded-full bg-gradient-to-r from-[#214c3f] via-[#5d8f76] to-[#c4e1c1] transition-all"
                                  style={{
                                    width: `${
                                      student.requiredOJTHours
                                        ? Math.min(
                                            (student.completedOJTHours /
                                              student.requiredOJTHours) *
                                              100,
                                            100,
                                          )
                                        : 0
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right mr-4">
                        {openRecord ? (
                          <StatusBadge
                            status="active"
                            label={`Timed in: ${formatTime(openRecord.timeIn)}`}
                          />
                        ) : (
                          <StatusBadge
                            status="inactive"
                            label="Not checked in"
                          />
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5 mr-3">
                        {["xlsx", "xls"].map((format) => {
                          const exportKey = `${student.studentId}-${format}`;
                          return (
                            <button
                              key={format}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDtrExport(student, format);
                              }}
                              disabled={exportingDtr === exportKey}
                              className="btn-secondary h-8 px-2 text-[10px] uppercase disabled:opacity-50"
                              title={`Export ${student.fullName}'s DTR as ${format.toUpperCase()}`}
                            >
                              {exportingDtr === exportKey ? "..." : format}
                            </button>
                          );
                        })}
                      </div>

                      <div className="text-[#5E7867] font-semibold text-lg">
                        {isExpanded ? "−" : "+"}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pl-4 border-l-2 border-forest/30 space-y-4">
                        {/* Quick Actions */}
                        <div className="flex gap-3">
                          {!openRecord ? (
                            <button
                              onClick={() => handleTimeIn(student.studentId)}
                              disabled={
                                actionInProgress === student.studentId ||
                                loadingAttendance[student.studentId]
                              }
                              className="flex-1 btn-primary text-sm disabled:opacity-50"
                            >
                              {actionInProgress === student.studentId
                                ? "Recording..."
                                : "Time In"}
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                handleTimeOut(openRecord._id, student.studentId)
                              }
                              disabled={
                                actionInProgress === openRecord._id ||
                                loadingAttendance[student.studentId]
                              }
                              className="flex-1 btn-danger text-sm disabled:opacity-50"
                            >
                              {actionInProgress === openRecord._id
                                ? "Recording..."
                                : "Time Out"}
                            </button>
                          )}
                        </div>

                        {!student.assessmentSubmittedAt && (
                          <form
                            onSubmit={(event) =>
                              handleAssessment(event, student)
                            }
                            className="rounded-lg border border-forest/15 bg-white p-4 space-y-3"
                          >
                            <p className="text-sm font-semibold text-navy">
                              Final assessment
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <input
                                required
                                className="input-field"
                                placeholder="Performance grade"
                                disabled={
                                  (student.completedOJTHours || 0) <
                                  (student.requiredOJTHours || 0)
                                }
                                value={
                                  assessmentForms[student.studentId]
                                    ?.performanceGrade || ""
                                }
                                onChange={(e) =>
                                  setAssessmentForms({
                                    ...assessmentForms,
                                    [student.studentId]: {
                                      ...assessmentForms[student.studentId],
                                      performanceGrade: e.target.value,
                                    },
                                  })
                                }
                              />
                              <input
                                required
                                type="file"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                className="input-field"
                                disabled={
                                  (student.completedOJTHours || 0) <
                                  (student.requiredOJTHours || 0)
                                }
                                onChange={(e) =>
                                  setAssessmentForms({
                                    ...assessmentForms,
                                    [student.studentId]: {
                                      ...assessmentForms[student.studentId],
                                      certificate: e.target.files[0],
                                    },
                                  })
                                }
                              />
                            </div>
                            <textarea
                              required
                              className="input-field min-h-24"
                              placeholder="Performance evaluation"
                              disabled={
                                (student.completedOJTHours || 0) <
                                (student.requiredOJTHours || 0)
                              }
                              value={
                                assessmentForms[student.studentId]
                                  ?.evaluation || ""
                              }
                              onChange={(e) =>
                                setAssessmentForms({
                                  ...assessmentForms,
                                  [student.studentId]: {
                                    ...assessmentForms[student.studentId],
                                    evaluation: e.target.value,
                                  },
                                })
                              }
                            />
                            <button
                              className="btn-primary px-4 py-2 text-sm"
                              disabled={
                                submittingAssessment === student.studentId ||
                                (student.completedOJTHours || 0) <
                                  (student.requiredOJTHours || 0)
                              }
                            >
                              {(student.completedOJTHours || 0) <
                              (student.requiredOJTHours || 0)
                                ? "Available after OJT completion"
                                : submittingAssessment === student.studentId
                                  ? "Submitting..."
                                  : "Submit and lock assessment"}
                            </button>
                          </form>
                        )}

                        {/* Attendance History */}
                        {loadingAttendance[student.studentId] ? (
                          <p className="text-sm text-navy/65 py-2">
                            Loading history...
                          </p>
                        ) : records.length === 0 ? (
                          <p className="text-sm text-navy/65 py-2">
                            No attendance records yet.
                          </p>
                        ) : (
                          <div className="bg-white rounded-lg p-3 space-y-2">
                            <p className="text-sm font-semibold text-navy">
                              Recent Attendance
                            </p>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {records.slice(0, 10).map((record) => (
                                <div
                                  key={record._id}
                                  className="flex justify-between text-sm p-2 bg-navy/5 rounded"
                                >
                                  <div>
                                    <p className="font-medium">
                                      {formatDate(record.date)}
                                    </p>
                                    <p className="text-navy/65 text-xs">
                                      In: {formatTime(record.timeIn)}
                                      {record.timeOut &&
                                        ` • Out: ${formatTime(record.timeOut)}`}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    {record.hoursLogged > 0 && (
                                      <p className="font-semibold text-[#5E7867]">
                                        {record.hoursLogged.toFixed(2)}h
                                      </p>
                                    )}
                                    <p className="text-xs text-navy/65">
                                      {record.status === "completed"
                                        ? "Completed"
                                        : "Open"}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
};

export default ManageStudentAttendance;
