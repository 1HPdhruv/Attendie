import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// ─── Prediction Engine (same logic as server/routes/predict.js) ───────────────
function analyzeAttendance(attendance, totalExpectedClasses = 90) {
  const entries = Object.entries(attendance || {});
  const total = entries.length;
  const present = entries.filter(([, v]) => v === "P").length;
  const currentPct = total > 0 ? (present / total) * 100 : 0;

  const dayAbsenceCount = [0, 0, 0, 0, 0, 0, 0];
  const dayTotal = [0, 0, 0, 0, 0, 0, 0];
  entries.forEach(([date, status]) => {
    const day = new Date(date).getDay();
    dayTotal[day]++;
    if (status === "A") dayAbsenceCount[day]++;
  });
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const riskDays = dayNames.filter(
    (_, i) => dayTotal[i] > 0 && dayAbsenceCount[i] / dayTotal[i] > 0.4
  );

  const recent = entries.slice(-10);
  const recentPct =
    recent.length > 0
      ? (recent.filter(([, v]) => v === "P").length / recent.length) * 100
      : currentPct;
  const trend =
    recentPct > currentPct + 2
      ? "improving"
      : recentPct < currentPct - 2
        ? "declining"
        : "stable";

  const remainingClasses = Math.max(0, totalExpectedClasses - total);
  const requiredPresent = Math.ceil(0.75 * totalExpectedClasses) - present;
  const canAffordAbsences = Math.max(0, remainingClasses - requiredPresent);

  const projectedFinal =
    total > 0
      ? ((present + (recentPct / 100) * remainingClasses) /
        totalExpectedClasses) *
      100
      : null;

  return {
    currentPct: +currentPct.toFixed(1),
    recentPct: +recentPct.toFixed(1),
    trend,
    riskDays,
    canAffordAbsences,
    projectedFinal: projectedFinal !== null ? +projectedFinal.toFixed(1) : null,
    atRisk: projectedFinal !== null && projectedFinal < 75,
    totalClasses: total,
    presentCount: present,
    absentCount: total - present,
  };
}

// ─── Mini Trend Pill ─────────────────────────────────────────────────────────
function TrendPill({ trend }) {
  const map = {
    improving: { icon: "↑", cls: "text-green-600 bg-green-100" },
    declining: { icon: "↓", cls: "text-red-600 bg-red-100" },
    stable: { icon: "→", cls: "text-yellow-600 bg-yellow-100" },
  };
  const { icon, cls } = map[trend] || map.stable;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>
      {icon} {trend}
    </span>
  );
}

// ─── At-Risk Panel ───────────────────────────────────────────────────────────
function AtRiskPanel({ students }) {
  const [open, setOpen] = useState(true);

  const atRisk = students
    .map((s) => ({ ...s, pred: analyzeAttendance(s.attendance) }))
    .filter((s) => s.pred.atRisk)
    .sort((a, b) => a.pred.projectedFinal - b.pred.projectedFinal);

  if (atRisk.length === 0) {
    return (
      <div className="mb-6 bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-center gap-3">
        <span className="text-xl">✅</span>
        <div>
          <p className="font-semibold text-green-700 text-sm">All students are on track!</p>
          <p className="text-green-600 text-xs">No one is predicted to fall below 75% attendance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-red-500 text-white hover:bg-red-600 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🚨</span>
          <span className="font-bold">
            At-Risk Students — {atRisk.length} alert{atRisk.length !== 1 ? "s" : ""}
          </span>
        </div>
        <span className="text-sm opacity-80">{open ? "▲ Hide" : "▼ Show"}</span>
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-red-100 text-red-800 text-left">
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Current %</th>
                <th className="px-4 py-3 font-semibold">Projected %</th>
                <th className="px-4 py-3 font-semibold">Trend</th>
                <th className="px-4 py-3 font-semibold">Risk Days</th>
                <th className="px-4 py-3 font-semibold">Absences Left</th>
              </tr>
            </thead>
            <tbody>
              {atRisk.map((s, i) => (
                <tr
                  key={s.studentId}
                  className={`border-t border-red-200 ${i % 2 === 0 ? "bg-white" : "bg-red-50/40"}`}
                >
                  <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500">{s.studentId}</td>
                  <td className="px-4 py-3 text-gray-700">{s.pred.currentPct}%</td>
                  <td className="px-4 py-3">
                    <span className="text-red-600 font-bold">
                      {s.pred.projectedFinal}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <TrendPill trend={s.pred.trend} />
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {s.pred.riskDays.length > 0
                      ? s.pred.riskDays.join(", ")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-bold ${s.pred.canAffordAbsences === 0
                          ? "text-red-600"
                          : "text-orange-500"
                        }`}
                    >
                      {s.pred.canAffordAbsences}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Add Student Modal ───────────────────────────────────────────────────────
function AddStudentModal({ onClose, onAdd, token }) {
  const [form, setForm] = useState({ name: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const handleSubmit = async () => {
    if (!form.name || !form.password) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add student");
      setSuccess(data);
      onAdd(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="font-bold text-lg mb-4">➕ Add New Student</h2>

        {success ? (
          <div className="text-center py-4">
            <p className="text-green-600 font-semibold text-lg mb-1">
              Student added! 🎉
            </p>
            <p className="text-gray-600 text-sm">
              ID: <strong>{success.studentId}</strong>
            </p>
            <div className="flex gap-3 mt-5 justify-center">
              <button
                onClick={() => {
                  setSuccess(null);
                  setForm({ name: "", password: "" });
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
              >
                Add Another
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Student Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-600 disabled:opacity-60"
              >
                {loading ? "Adding..." : "Add Student"}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 border rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Teacher Component ───────────────────────────────────────────────────
export default function Teacher() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [activeTab, setActiveTab] = useState("attendance"); // "attendance" | "predictions"

  // Collect all unique dates across all students
  const allDates = [
    ...new Set(
      students.flatMap((s) => Object.keys(s.attendance || {}))
    ),
  ].sort();

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    fetch("/api/students", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then((data) => {
        setStudents(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleAttendanceChange = (studentId, date, value) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.studentId === studentId
          ? { ...s, attendance: { ...s.attendance, [date]: value } }
          : s
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      await Promise.all(
        students.map((s) =>
          fetch(`/api/students/${s.studentId}/attendance`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ attendance: s.attendance }),
          })
        )
      );
      setSaveMsg("✅ Saved successfully!");
    } catch {
      setSaveMsg("❌ Save failed. Please try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (!selected.size) return;
    if (!window.confirm(`Delete ${selected.size} student(s)?`)) return;
    try {
      await Promise.all(
        [...selected].map((id) =>
          fetch(`/api/students/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      setStudents((prev) =>
        prev.filter((s) => !selected.has(s.studentId))
      );
      setSelected(new Set());
    } catch {
      alert("Failed to delete some students. Please try again.");
    }
  };

  // ── Styling ──────────────────────────────────────────────────────────────
  const bg = darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900";
  const card = darkMode
    ? "bg-gray-800 border-gray-700"
    : "bg-white border-gray-200";
  const sub = darkMode ? "text-gray-400" : "text-gray-500";
  const tableTh = darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-50 text-gray-600";
  const tableTr = darkMode ? "border-gray-700 hover:bg-gray-750" : "border-gray-100 hover:bg-gray-50";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6 bg-white rounded-2xl shadow border border-red-200">
          <p className="text-red-600 font-semibold">⚠ {error}</p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg text-sm"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav className={`${card} border-b px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">👩‍🏫</span>
          <span className="font-bold text-lg">Attendie</span>
          <span className={`text-xs ${sub} ml-2`}>
            Teacher Dashboard • {students.length} student{students.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="text-sm px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            + Add Student
          </button>
          {selected.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="text-sm px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              🗑 Delete ({selected.size})
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-60"
          >
            {saving ? "Saving..." : "💾 Save"}
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`text-sm px-3 py-1.5 rounded-lg border ${card} hover:opacity-80`}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* ── Save feedback ────────────────────────────────────────────────── */}
      {saveMsg && (
        <div className="text-center py-2 text-sm font-medium bg-green-50 border-b border-green-200 text-green-700">
          {saveMsg}
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="max-w-full px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b">
          {["attendance", "predictions"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-semibold capitalize rounded-t-lg transition-colors ${activeTab === tab
                  ? "bg-blue-500 text-white"
                  : `${sub} hover:text-gray-700`
                }`}
            >
              {tab === "attendance" ? "📋 Attendance" : "🔮 Predictions"}
            </button>
          ))}
        </div>

        {/* ── Tab: Attendance ─────────────────────────────────────────────── */}
        {activeTab === "attendance" && (
          <div className={`${card} border rounded-2xl shadow-sm overflow-hidden`}>
            {students.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <p className="text-4xl mb-3">👥</p>
                <p className="font-semibold">No students yet.</p>
                <p className="text-sm mt-1">Click "Add Student" to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={tableTh}>
                      <th className="px-4 py-3 font-semibold text-left sticky left-0 z-10 bg-inherit">
                        <input
                          type="checkbox"
                          checked={selected.size === students.length}
                          onChange={() =>
                            setSelected(
                              selected.size === students.length
                                ? new Set()
                                : new Set(students.map((s) => s.studentId))
                            )
                          }
                          className="mr-2"
                        />
                        Student
                      </th>
                      <th className="px-3 py-3 font-semibold text-center">%</th>
                      {allDates.map((date) => (
                        <th key={date} className="px-2 py-3 font-semibold text-center whitespace-nowrap">
                          {date}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => {
                      const pct = analyzeAttendance(s.attendance).currentPct;
                      return (
                        <tr
                          key={s.studentId}
                          className={`border-t ${tableTr} transition-colors`}
                        >
                          <td className={`px-4 py-3 sticky left-0 z-10 ${card} font-medium`}>
                            <input
                              type="checkbox"
                              checked={selected.has(s.studentId)}
                              onChange={() => toggleSelect(s.studentId)}
                              className="mr-2"
                            />
                            <span>{s.name}</span>
                            <span className={`block text-xs ${sub}`}>
                              {s.studentId}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span
                              className={`font-bold text-xs px-2 py-0.5 rounded-full ${pct >= 75
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-600"
                                }`}
                            >
                              {pct}%
                            </span>
                          </td>
                          {allDates.map((date) => {
                            const val = s.attendance?.[date] || "";
                            return (
                              <td key={date} className="px-2 py-3 text-center">
                                <select
                                  value={val}
                                  onChange={(e) =>
                                    handleAttendanceChange(
                                      s.studentId,
                                      date,
                                      e.target.value
                                    )
                                  }
                                  className={`text-xs rounded px-1 py-0.5 border font-semibold focus:outline-none ${val === "P"
                                      ? "bg-green-100 text-green-700 border-green-300"
                                      : val === "A"
                                        ? "bg-red-100 text-red-600 border-red-300"
                                        : "bg-gray-100 text-gray-400 border-gray-300"
                                    }`}
                                >
                                  <option value="">—</option>
                                  <option value="P">P</option>
                                  <option value="A">A</option>
                                </select>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Predictions ─────────────────────────────────────────────── */}
        {activeTab === "predictions" && (
          <div>
            {/* At-risk panel */}
            <AtRiskPanel students={students} />

            {/* Full predictions table */}
            <div className={`${card} border rounded-2xl shadow-sm overflow-hidden`}>
              <div className="px-5 py-4 border-b">
                <h2 className="font-bold text-base">📈 All Student Predictions</h2>
                <p className={`text-xs ${sub} mt-0.5`}>
                  Based on attendance history and recent trend (last 10 classes).
                  Semester total: 90 classes.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={tableTh}>
                      <th className="px-4 py-3 text-left font-semibold">Student</th>
                      <th className="px-4 py-3 text-center font-semibold">Current %</th>
                      <th className="px-4 py-3 text-center font-semibold">Recent %</th>
                      <th className="px-4 py-3 text-center font-semibold">Projected %</th>
                      <th className="px-4 py-3 text-center font-semibold">Trend</th>
                      <th className="px-4 py-3 text-center font-semibold">Absences left</th>
                      <th className="px-4 py-3 text-center font-semibold">Risk Days</th>
                      <th className="px-4 py-3 text-center font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students
                      .map((s) => ({
                        ...s,
                        pred: analyzeAttendance(s.attendance),
                      }))
                      .sort((a, b) => a.pred.projectedFinal - b.pred.projectedFinal)
                      .map((s, i) => (
                        <tr
                          key={s.studentId}
                          className={`border-t ${tableTr} transition-colors`}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium">{s.name}</p>
                            <p className={`text-xs ${sub}`}>{s.studentId}</p>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">
                            {s.pred.currentPct}%
                          </td>
                          <td className="px-4 py-3 text-center text-gray-500">
                            {s.pred.recentPct}%
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`font-bold ${s.pred.projectedFinal >= 75
                                  ? "text-green-600"
                                  : "text-red-600"
                                }`}
                            >
                              {s.pred.projectedFinal !== null
                                ? `${s.pred.projectedFinal}%`
                                : "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <TrendPill trend={s.pred.trend} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`font-bold ${s.pred.canAffordAbsences === 0
                                  ? "text-red-600"
                                  : s.pred.canAffordAbsences <= 3
                                    ? "text-orange-500"
                                    : "text-green-600"
                                }`}
                            >
                              {s.pred.canAffordAbsences}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-gray-500">
                            {s.pred.riskDays.length > 0
                              ? s.pred.riskDays.join(", ")
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {s.pred.atRisk ? (
                              <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded-full">
                                🚨 At Risk
                              </span>
                            ) : (
                              <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                ✅ Safe
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Add Student Modal ─────────────────────────────────────────────── */}
      {showAddModal && (
        <AddStudentModal
          token={token}
          onClose={() => setShowAddModal(false)}
          onAdd={(newStudent) => {
            setStudents((prev) => [...prev, newStudent]);
          }}
        />
      )}
    </div>
  );
}
