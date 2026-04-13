import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// ─── Prediction Engine (client-side mirror of server logic) ───────────────────
function analyzeAttendance(attendance, totalExpectedClasses = 90) {
  const entries = Object.entries(attendance || {});
  const total = entries.length;
  const present = entries.filter(([, v]) => v === "P").length;
  const currentPct = total > 0 ? (present / total) * 100 : 0;

  // Day-of-week pattern
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

  // Recent trend (last 10 classes)
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

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────
function AttendanceBar({ pct, color = "bg-blue-500" }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div
        className={`h-3 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

// ─── Trend Badge ──────────────────────────────────────────────────────────────
function TrendBadge({ trend }) {
  const map = {
    improving: {
      label: "↑ Improving",
      cls: "bg-green-100 text-green-700 border-green-300",
    },
    declining: {
      label: "↓ Declining",
      cls: "bg-red-100 text-red-700 border-red-300",
    },
    stable: {
      label: "→ Stable",
      cls: "bg-yellow-100 text-yellow-700 border-yellow-300",
    },
  };
  const { label, cls } = map[trend] || map.stable;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

// ─── Prediction Card ─────────────────────────────────────────────────────────
function PredictionCard({ prediction }) {
  const {
    currentPct,
    recentPct,
    trend,
    riskDays,
    canAffordAbsences,
    projectedFinal,
    atRisk,
    totalClasses,
    presentCount,
    absentCount,
  } = prediction;

  const borderColor = atRisk ? "border-red-400" : "border-green-400";
  const headerBg = atRisk
    ? "bg-red-500"
    : currentPct >= 85
      ? "bg-green-500"
      : "bg-blue-500";
  const barColor = atRisk
    ? "bg-red-500"
    : currentPct >= 75
      ? "bg-green-500"
      : "bg-yellow-500";

  return (
    <div className={`rounded-2xl border-2 ${borderColor} overflow-hidden shadow-md mt-6`}>
      {/* Header */}
      <div className={`${headerBg} text-white px-5 py-3 flex items-center gap-2`}>
        <span className="text-xl">📊</span>
        <h3 className="font-bold text-base">Attendance Prediction</h3>
        {atRisk && (
          <span className="ml-auto text-xs bg-white text-red-600 font-bold px-2 py-0.5 rounded-full">
            ⚠ AT RISK
          </span>
        )}
      </div>

      <div className="bg-white p-5 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-2xl font-extrabold text-gray-800">{currentPct}%</p>
            <p className="text-xs text-gray-500 mt-0.5">Current</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-2xl font-extrabold text-gray-800">{recentPct}%</p>
            <p className="text-xs text-gray-500 mt-0.5">Last 10 classes</p>
          </div>
          <div
            className={`rounded-xl p-3 ${atRisk ? "bg-red-50" : "bg-green-50"
              }`}
          >
            <p
              className={`text-2xl font-extrabold ${atRisk ? "text-red-600" : "text-green-600"
                }`}
            >
              {projectedFinal !== null ? `${projectedFinal}%` : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Projected final</p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Attendance Progress</span>
            <span>75% required</span>
          </div>
          <AttendanceBar pct={currentPct} color={barColor} />
          {/* 75% marker */}
          <div className="relative h-0">
            <div
              className="absolute top-[-14px] w-0.5 h-3 bg-gray-400"
              style={{ left: "75%" }}
            />
          </div>
        </div>

        {/* Counts + trend */}
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
            ✅ Present: {presentCount}
          </span>
          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
            ❌ Absent: {absentCount}
          </span>
          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">
            📅 Total: {totalClasses}
          </span>
          <TrendBadge trend={trend} />
        </div>

        {/* Can afford / at risk message */}
        {atRisk ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            🚨 <strong>You are at risk of falling below 75%!</strong> Maintain
            full attendance from here onwards to recover.
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
            ✅ You can afford{" "}
            <strong>{canAffordAbsences} more absence{canAffordAbsences !== 1 ? "s" : ""}</strong>{" "}
            and still stay above 75%.
          </div>
        )}

        {/* Risk days */}
        {riskDays.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
            ⚠️ <strong>Habitual absence days:</strong>{" "}
            {riskDays.join(", ")} — You tend to skip these days more than 40% of
            the time. Try to be extra careful!
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Student Component ───────────────────────────────────────────────────
export default function Student() {
  const location = useLocation();
  const navigate = useNavigate();

  const studentId = location.state?.studentId;
  const token = localStorage.getItem("token");

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (!studentId || !token) {
      navigate("/");
      return;
    }

    fetch(`/api/students/${studentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch student data");
        return r.json();
      })
      .then((data) => {
        setStudent(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [studentId, token, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  // ── Build attendance display ──────────────────────────────────────────────
  const attendanceEntries = student
    ? Object.entries(student.attendance || {}).sort(
      ([a], [b]) => new Date(a) - new Date(b)
    )
    : [];

  const prediction = student ? analyzeAttendance(student.attendance) : null;

  // ── Dark mode classes ─────────────────────────────────────────────────────
  const bg = darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900";
  const card = darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const sub = darkMode ? "text-gray-400" : "text-gray-500";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6 bg-white rounded-2xl shadow border border-red-200 max-w-sm">
          <p className="text-red-600 font-semibold">⚠ {error}</p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg text-sm"
          >
            Go back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className={`${card} border-b px-6 py-4 flex items-center justify-between shadow-sm`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎓</span>
          <span className="font-bold text-lg">Attendie</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm ${sub}`}>{student?.name}</span>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`text-sm px-3 py-1.5 rounded-lg border ${card} hover:opacity-80`}
            title="Toggle dark mode"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Student info header */}
        <div className={`${card} border rounded-2xl p-6 shadow-sm mb-6`}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
              {student?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold">{student?.name}</h1>
              <p className={`text-sm ${sub}`}>ID: {student?.studentId}</p>
            </div>
            {prediction && (
              <div className="ml-auto text-right">
                <p
                  className={`text-3xl font-extrabold ${prediction.currentPct >= 75
                      ? "text-green-500"
                      : "text-red-500"
                    }`}
                >
                  {prediction.currentPct}%
                </p>
                <p className={`text-xs ${sub}`}>Overall Attendance</p>
              </div>
            )}
          </div>
        </div>

        {/* Prediction card */}
        {prediction && <PredictionCard prediction={prediction} />}

        {/* Attendance record table */}
        <div className={`${card} border rounded-2xl shadow-sm mt-6 overflow-hidden`}>
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-bold text-base">📋 Attendance Record</h2>
            <span className={`text-sm ${sub}`}>
              {attendanceEntries.length} class{attendanceEntries.length !== 1 ? "es" : ""}
            </span>
          </div>

          {attendanceEntries.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No attendance records yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`${darkMode ? "bg-gray-700" : "bg-gray-50"} text-left`}>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Day</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceEntries.map(([date, status], idx) => {
                    const d = new Date(date);
                    const dayName = d.toLocaleDateString("en-US", {
                      weekday: "short",
                    });
                    const isPresent = status === "P";
                    return (
                      <tr
                        key={date}
                        className={`border-t ${darkMode ? "border-gray-700" : "border-gray-100"
                          } ${idx % 2 === 0 ? "" : darkMode ? "bg-gray-750" : "bg-gray-50/50"}`}
                      >
                        <td className="px-5 py-3">{date}</td>
                        <td className={`px-5 py-3 ${sub}`}>{dayName}</td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold ${isPresent
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                              }`}
                          >
                            {isPresent ? "✅ Present" : "❌ Absent"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
