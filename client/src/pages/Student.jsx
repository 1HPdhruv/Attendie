import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Filler,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Filler
);

// ─── Prediction Engine (client-side mirror of server logic) ───────────────────
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

// ─── Decision Tree Risk Prediction ───────────────────────────────────────────
function predictRisk(attendancePct, cgpa, avgMarks) {
  if (attendancePct < 50) return { risk: "high", reason: "Attendance critically low (below 50%)", confidence: 0.95 };
  if (attendancePct < 75) {
    if (cgpa < 5) return { risk: "high", reason: "Low attendance combined with low CGPA", confidence: 0.92 };
    if (avgMarks < 40) return { risk: "high", reason: "Low attendance with failing marks", confidence: 0.88 };
    return { risk: "medium", reason: "Attendance below required 75%", confidence: 0.82 };
  }
  if (cgpa < 5) return { risk: "medium", reason: "Good attendance but CGPA is low", confidence: 0.78 };
  if (avgMarks < 60) return { risk: "medium", reason: "Average marks below 60%", confidence: 0.72 };
  return { risk: "low", reason: "Good attendance, CGPA and marks", confidence: 0.88 };
}

// ─── Risk Badge ──────────────────────────────────────────────────────────────
function RiskBadge({ risk, large }) {
  const m = {
    high: { label: "🔴 High Risk", cls: "bg-red-100 text-red-700 border-red-300", emoji: "🔴" },
    medium: { label: "🟡 Medium Risk", cls: "bg-yellow-100 text-yellow-700 border-yellow-300", emoji: "🟡" },
    low: { label: "🟢 Low Risk", cls: "bg-green-100 text-green-700 border-green-300", emoji: "🟢" },
  };
  const { label, cls } = m[risk] || m.low;
  return (
    <span className={`font-bold px-3 py-1 rounded-full border ${cls} ${large ? "text-sm" : "text-xs"}`}>
      {label}
    </span>
  );
}

// ─── Trend Badge ─────────────────────────────────────────────────────────────
function TrendBadge({ trend }) {
  const map = {
    improving: { label: "↑ Improving", cls: "bg-green-100 text-green-700 border-green-300" },
    declining: { label: "↓ Declining", cls: "bg-red-100 text-red-700 border-red-300" },
    stable: { label: "→ Stable", cls: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  };
  const { label, cls } = map[trend] || map.stable;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
}

// ─── Attendance Bar ──────────────────────────────────────────────────────────
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

// ─── Main Student Component ───────────────────────────────────────────────────
export default function Student() {
  const location = useLocation();
  const navigate = useNavigate();

  const studentId = location.state?.id || location.state?.studentId;
  const token = localStorage.getItem("token");

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!studentId || !token) {
      navigate("/");
      return;
    }

    fetch(`${import.meta.env.VITE_API_URL}/Student?std_id=${studentId}`, {
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

  // ── Build data ─────────────────────────────────────────────────────────────
  const attendance = student?.attandance || student?.attendance || {};
  const attendanceEntries = Object.entries(attendance).sort(
    ([a], [b]) => new Date(a) - new Date(b)
  );

  const prediction = student ? analyzeAttendance(attendance) : null;

  const marks = student?.marks || [];
  const avgMarks = marks.length
    ? +(marks.reduce((s, m) => s + (m.marksObtained / m.maxMarks) * 100, 0) / marks.length).toFixed(1)
    : 0;
  const cgpa = student?.cgpa || 0;

  const riskResult = prediction ? predictRisk(prediction.currentPct, cgpa, avgMarks) : null;

  // ── Semester-wise marks breakdown ──────────────────────────────────────────
  const semMap = {};
  marks.forEach((m) => {
    const sem = m.semester || 1;
    if (!semMap[sem]) semMap[sem] = { marks: [], total: 0, count: 0 };
    semMap[sem].marks.push(m);
    semMap[sem].total += (m.marksObtained / m.maxMarks) * 100;
    semMap[sem].count++;
  });
  const semesters = Object.entries(semMap)
    .map(([sem, data]) => ({ semester: +sem, avgPct: +(data.total / data.count).toFixed(1), marks: data.marks }))
    .sort((a, b) => a.semester - b.semester);

  // ── Chart Data ─────────────────────────────────────────────────────────────
  // Attendance Doughnut
  const attendanceDoughnut = prediction
    ? {
        labels: ["Present", "Absent"],
        datasets: [{
          data: [prediction.presentCount, prediction.absentCount],
          backgroundColor: ["#22c55e", "#ef4444"],
          borderWidth: 0,
          cutout: "70%",
        }],
      }
    : null;

  // Marks Bar Chart (by subject)
  const subjectMap = {};
  marks.forEach((m) => {
    if (!subjectMap[m.subject]) subjectMap[m.subject] = { total: 0, count: 0 };
    subjectMap[m.subject].total += (m.marksObtained / m.maxMarks) * 100;
    subjectMap[m.subject].count++;
  });
  const subjectLabels = Object.keys(subjectMap);
  const subjectData = subjectLabels.map((s) => +(subjectMap[s].total / subjectMap[s].count).toFixed(1));

  const marksBarData = {
    labels: subjectLabels.length > 0 ? subjectLabels : ["No Data"],
    datasets: [{
      label: "Avg Marks %",
      data: subjectData.length > 0 ? subjectData : [0],
      backgroundColor: subjectData.map((v) => v >= 60 ? "#22c55e" : v >= 40 ? "#eab308" : "#ef4444"),
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  // ── Dark mode classes ──────────────────────────────────────────────────────
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
          <button onClick={() => navigate("/")} className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg text-sm">
            Go back to login
          </button>
        </div>
      </div>
    );
  }

  const tabs = ["overview", "marks", "attendance"];
  const tabLabels = { overview: "📊 Overview", marks: "📝 Marks", attendance: "📋 Attendance" };

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className={`${card} border-b px-6 py-4 flex items-center justify-between shadow-sm`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎓</span>
          <span className="font-bold text-lg">Smart Attendance</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm ${sub}`}>{student?.name}</span>
          <button onClick={() => setDarkMode(!darkMode)}
            className={`text-sm px-3 py-1.5 rounded-lg border ${card} hover:opacity-80`} title="Toggle dark mode">
            {darkMode ? "☀️" : "🌙"}
          </button>
          <button onClick={handleLogout}
            className="text-sm px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
            Logout
          </button>
        </div>
      </nav>

      {/* ── Risk Alert Banner ─────────────────────────────────────────────── */}
      {riskResult && riskResult.risk === "high" && (
        <div className="bg-red-500 text-white px-6 py-3 flex items-center gap-3">
          <span className="text-xl">🚨</span>
          <div>
            <p className="font-bold text-sm">
              ⚠ Warning: You are at High Academic Risk!
            </p>
            <p className="text-xs opacity-90">
              {riskResult.reason}. Please contact your faculty advisor for guidance.
            </p>
          </div>
        </div>
      )}
      {riskResult && riskResult.risk === "medium" && (
        <div className="bg-yellow-500 text-gray-900 px-6 py-3 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-bold text-sm">Attention: Medium Risk Detected</p>
            <p className="text-xs opacity-80">{riskResult.reason}. Focus on improving your performance.</p>
          </div>
        </div>
      )}

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Student Info + Risk Card */}
        <div className={`${card} border rounded-2xl p-6 shadow-sm mb-6`}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
              {student?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{student?.name}</h1>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className={`text-xs ${sub}`}>ID: {student?.id}</span>
                {student?.department && (
                  <span className={`text-xs ${sub}`}>• Dept: {student.department}</span>
                )}
                {student?.email && (
                  <span className={`text-xs ${sub}`}>• {student.email}</span>
                )}
              </div>
            </div>
            <div className="text-right">
              {riskResult && <RiskBadge risk={riskResult.risk} large />}
              {prediction && (
                <p className={`text-3xl font-extrabold mt-2 ${prediction.currentPct >= 75 ? "text-green-500" : "text-red-500"}`}>
                  {prediction.currentPct}%
                </p>
              )}
              <p className={`text-xs ${sub}`}>Attendance</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className={`${card} border rounded-xl p-4 text-center shadow-sm`}>
            <p className="text-2xl font-extrabold text-blue-500">{cgpa}</p>
            <p className={`text-xs ${sub} mt-1`}>CGPA</p>
          </div>
          <div className={`${card} border rounded-xl p-4 text-center shadow-sm`}>
            <p className="text-2xl font-extrabold text-purple-500">{avgMarks}%</p>
            <p className={`text-xs ${sub} mt-1`}>Avg Marks</p>
          </div>
          <div className={`${card} border rounded-xl p-4 text-center shadow-sm`}>
            <p className="text-2xl font-extrabold text-green-500">{prediction?.presentCount || 0}</p>
            <p className={`text-xs ${sub} mt-1`}>Classes Present</p>
          </div>
          <div className={`${card} border rounded-xl p-4 text-center shadow-sm`}>
            <p className="text-2xl font-extrabold text-red-500">{prediction?.absentCount || 0}</p>
            <p className={`text-xs ${sub} mt-1`}>Classes Absent</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-colors ${
                activeTab === tab ? "bg-blue-500 text-white" : `${sub} hover:text-gray-700`
              }`}>
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        {/* ── Tab: Overview ──────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Risk Analysis Card */}
            {riskResult && (
              <div className={`rounded-2xl border-2 ${
                riskResult.risk === "high" ? "border-red-400" : riskResult.risk === "medium" ? "border-yellow-400" : "border-green-400"
              } overflow-hidden shadow-md`}>
                <div className={`${
                  riskResult.risk === "high" ? "bg-red-500" : riskResult.risk === "medium" ? "bg-yellow-500" : "bg-green-500"
                } text-white px-5 py-3 flex items-center gap-2`}>
                  <span className="text-xl">🧠</span>
                  <h3 className="font-bold text-base">ML Risk Prediction (Decision Tree)</h3>
                  <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full">
                    Confidence: {((riskResult.confidence || 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="bg-white p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-2xl font-extrabold text-gray-800">{prediction?.currentPct}%</p>
                      <p className="text-xs text-gray-500 mt-0.5">Attendance</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-2xl font-extrabold text-gray-800">{cgpa}</p>
                      <p className="text-xs text-gray-500 mt-0.5">CGPA</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-2xl font-extrabold text-gray-800">{avgMarks}%</p>
                      <p className="text-xs text-gray-500 mt-0.5">Avg Marks</p>
                    </div>
                  </div>
                  <div className={`rounded-xl p-3 text-sm ${
                    riskResult.risk === "high" ? "bg-red-50 text-red-700 border border-red-200"
                    : riskResult.risk === "medium" ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                    : "bg-green-50 text-green-700 border border-green-200"
                  }`}>
                    <strong>Analysis:</strong> {riskResult.reason}
                  </div>
                </div>
              </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Attendance Doughnut */}
              {attendanceDoughnut && (
                <div className={`${card} border rounded-2xl p-5 shadow-sm`}>
                  <h3 className="font-bold text-sm mb-4">📊 Attendance Breakdown</h3>
                  <div className="h-52 flex items-center justify-center">
                    <Doughnut data={attendanceDoughnut} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: "bottom", labels: { color: darkMode ? "#9ca3af" : "#6b7280", font: { size: 12 } } },
                      },
                    }} />
                  </div>
                </div>
              )}

              {/* Marks Bar Chart */}
              <div className={`${card} border rounded-2xl p-5 shadow-sm`}>
                <h3 className="font-bold text-sm mb-4">📝 Subject-wise Marks</h3>
                <div className="h-52">
                  <Bar data={marksBarData} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { ticks: { color: darkMode ? "#9ca3af" : "#6b7280" }, grid: { display: false } },
                      y: { min: 0, max: 100, ticks: { color: darkMode ? "#9ca3af" : "#6b7280" }, grid: { color: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" } },
                    },
                  }} />
                </div>
              </div>
            </div>

            {/* Attendance Progress */}
            {prediction && (
              <div className={`${card} border rounded-2xl p-5 shadow-sm`}>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Attendance Progress</span>
                  <span>75% required</span>
                </div>
                <AttendanceBar
                  pct={prediction.currentPct}
                  color={prediction.atRisk ? "bg-red-500" : prediction.currentPct >= 75 ? "bg-green-500" : "bg-yellow-500"}
                />
                <div className="flex flex-wrap gap-2 text-sm mt-4">
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">✅ Present: {prediction.presentCount}</span>
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">❌ Absent: {prediction.absentCount}</span>
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">📅 Total: {prediction.totalClasses}</span>
                  <TrendBadge trend={prediction.trend} />
                </div>
                {prediction.atRisk ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 mt-4">
                    🚨 <strong>You are at risk of falling below 75%!</strong> Maintain full attendance from here onwards.
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 mt-4">
                    ✅ You can afford <strong>{prediction.canAffordAbsences} more absence{prediction.canAffordAbsences !== 1 ? "s" : ""}</strong> and still stay above 75%.
                  </div>
                )}
                {prediction.riskDays.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800 mt-3">
                    ⚠️ <strong>Habitual absence days:</strong> {prediction.riskDays.join(", ")} — You tend to skip these days more than 40% of the time.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Marks ─────────────────────────────────────────────────── */}
        {activeTab === "marks" && (
          <div className="space-y-6">
            {marks.length === 0 ? (
              <div className={`${card} border rounded-2xl p-12 text-center text-gray-400`}>
                <p className="text-4xl mb-3">📝</p>
                <p className="font-semibold">No marks recorded yet.</p>
                <p className="text-sm mt-1">Your faculty will add your marks here.</p>
              </div>
            ) : (
              <>
                {/* Semester-wise cards */}
                {semesters.map((sem) => (
                  <div key={sem.semester} className={`${card} border rounded-2xl shadow-sm overflow-hidden`}>
                    <div className="px-5 py-3 border-b flex items-center justify-between">
                      <h3 className="font-bold text-sm">Semester {sem.semester}</h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        sem.avgPct >= 60 ? "bg-green-100 text-green-700" : sem.avgPct >= 40 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                      }`}>Avg: {sem.avgPct}%</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-50 text-gray-600"}>
                            <th className="px-4 py-2 text-left font-semibold">Subject</th>
                            <th className="px-4 py-2 text-center font-semibold">Exam Type</th>
                            <th className="px-4 py-2 text-center font-semibold">Marks</th>
                            <th className="px-4 py-2 text-center font-semibold">Percentage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sem.marks.map((m, i) => {
                            const pct = +((m.marksObtained / m.maxMarks) * 100).toFixed(1);
                            return (
                              <tr key={i} className={`border-t ${darkMode ? "border-gray-700" : "border-gray-100"}`}>
                                <td className="px-4 py-2 font-medium">{m.subject}</td>
                                <td className="px-4 py-2 text-center">
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full capitalize">{m.examType}</span>
                                </td>
                                <td className="px-4 py-2 text-center font-bold">{m.marksObtained} / {m.maxMarks}</td>
                                <td className="px-4 py-2 text-center">
                                  <span className={`font-bold ${pct >= 60 ? "text-green-600" : pct >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                                    {pct}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Tab: Attendance Record ──────────────────────────────────────── */}
        {activeTab === "attendance" && (
          <div className={`${card} border rounded-2xl shadow-sm overflow-hidden`}>
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-base">📋 Attendance Record</h2>
              <span className={`text-sm ${sub}`}>
                {attendanceEntries.length} class{attendanceEntries.length !== 1 ? "es" : ""}
              </span>
            </div>

            {attendanceEntries.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No attendance records yet.</div>
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
                      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
                      const isPresent = status === "P";
                      return (
                        <tr key={date}
                          className={`border-t ${darkMode ? "border-gray-700" : "border-gray-100"} ${
                            idx % 2 === 0 ? "" : darkMode ? "bg-gray-750" : "bg-gray-50/50"
                          }`}>
                          <td className="px-5 py-3">{date}</td>
                          <td className={`px-5 py-3 ${sub}`}>{dayName}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold ${
                              isPresent ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}>
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
        )}
      </main>
    </div>
  );
}
