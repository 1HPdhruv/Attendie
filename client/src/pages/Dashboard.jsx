import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Pie, Bar, Line } from "react-chartjs-2";

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

// ─── Risk Badge Component ────────────────────────────────────────────────────
function RiskBadge({ risk }) {
  const map = {
    high: {
      label: "HIGH RISK",
      cls: "bg-red-100 text-red-700 border-red-300",
    },
    medium: {
      label: "MEDIUM RISK",
      cls: "bg-yellow-100 text-yellow-700 border-yellow-300",
    },
    low: {
      label: "LOW RISK",
      cls: "bg-green-100 text-green-700 border-green-300",
    },
  };
  const { label, cls } = map[risk] || map.low;
  return (
    <span
      className={`text-xs font-bold px-3 py-1 rounded-full border ${cls}`}
    >
      {label}
    </span>
  );
}

// ─── Summary Card ────────────────────────────────────────────────────────────
function SummaryCard({ label, value, color = "text-blue-600", bg = "bg-blue-50" }) {
  return (
    <div className={`${bg} rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-white/10`}>
      <div>
        <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Alert Card ──────────────────────────────────────────────────────────────
function AlertCard({ alert }) {
  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3 shadow-sm">
      <div className="flex-1">
        <p className="font-bold text-red-800 text-sm">
          {alert.name}{" "}
          <span className="text-red-500 font-normal">({alert.studentId})</span>
        </p>
        <p className="text-red-600 text-xs mt-1">{alert.message}</p>
        <div className="flex gap-3 mt-2 text-xs text-red-500">
          <span>Attendance: {alert.attendancePct}%</span>
          <span>CGPA: {alert.cgpa}</span>
          <span>Avg Marks: {alert.avgMarks}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard Component ────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [dashData, setDashData] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterRisk, setFilterRisk] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    Promise.all([
      fetch(`${import.meta.env.VITE_API_URL}/api/risk/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to load dashboard");
        return r.json();
      }),
      fetch(`${import.meta.env.VITE_API_URL}/api/risk/predict`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to load predictions");
        return r.json();
      }),
    ])
      .then(([dashboardData, predictData]) => {
        setDashData(dashboardData);
        setPredictions(predictData.predictions || []);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading Risk Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center p-6 bg-gray-800 rounded-2xl shadow border border-red-500 max-w-sm">
          <p className="text-red-400 font-semibold">{error}</p>
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

  const summary = dashData?.summary || {};
  const alerts = dashData?.alerts || [];
  const attendanceBuckets = dashData?.attendanceBuckets || {};

  // Risk Distribution Pie Chart
  const pieData = {
    labels: ["Low Risk", "Medium Risk", "High Risk"],
    datasets: [
      {
        data: [summary.lowRisk || 0, summary.mediumRisk || 0, summary.highRisk || 0],
        backgroundColor: ["#22c55e", "#eab308", "#ef4444"],
        borderColor: ["#16a34a", "#ca8a04", "#dc2626"],
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: "#9ca3af", font: { size: 12 }, padding: 16 },
      },
    },
  };

  // Attendance Distribution Bar Chart
  const barData = {
    labels: Object.keys(attendanceBuckets),
    datasets: [
      {
        label: "Students",
        data: Object.values(attendanceBuckets),
        backgroundColor: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4"],
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Attendance Distribution",
        color: "#e5e7eb",
        font: { size: 14, weight: "bold" },
      },
    },
    scales: {
      x: { ticks: { color: "#9ca3af" }, grid: { display: false } },
      y: {
        ticks: { color: "#9ca3af", stepSize: 1 },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
    },
  };

  // Semester-wise Performance Line Chart
  const allSemesters = {};
  predictions.forEach((p) => {
    (p.semesterPerformance || []).forEach((sp) => {
      if (!allSemesters[sp.semester]) allSemesters[sp.semester] = { total: 0, count: 0 };
      allSemesters[sp.semester].total += sp.avgMarks;
      allSemesters[sp.semester].count++;
    });
  });
  const semLabels = Object.keys(allSemesters).sort((a, b) => a - b).map((s) => `Sem ${s}`);
  const semData = Object.keys(allSemesters)
    .sort((a, b) => a - b)
    .map((s) => +(allSemesters[s].total / allSemesters[s].count).toFixed(1));

  const lineData = {
    labels: semLabels.length > 0 ? semLabels : ["Sem 1"],
    datasets: [
      {
        label: "Avg Marks %",
        data: semData.length > 0 ? semData : [0],
        borderColor: "#818cf8",
        backgroundColor: "rgba(129, 140, 248, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: "#818cf8",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Semester-wise Marks Trend",
        color: "#e5e7eb",
        font: { size: 14, weight: "bold" },
      },
    },
    scales: {
      x: { ticks: { color: "#9ca3af" }, grid: { display: false } },
      y: {
        min: 0,
        max: 100,
        ticks: { color: "#9ca3af" },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
    },
  };

  // Filter predictions
  const filteredPredictions = predictions.filter((p) => {
    const matchRisk = filterRisk === "all" || p.risk === filterRisk;
    const matchSearch =
      searchQuery === "" ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.studentId?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchRisk && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div>
            <span className="font-bold text-lg">Risk Prediction Dashboard</span>
            <span className="text-xs text-gray-500 ml-2">
              Smart Academic Risk System
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/Teacher")}
            className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Teacher Panel
          </button>
          <button
            onClick={handleLogout}
            className="text-sm px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <SummaryCard label="Total Students" value={summary.totalStudents || 0} color="text-blue-400" bg="bg-gray-800" />
          <SummaryCard label="Low Risk" value={summary.lowRisk || 0} color="text-green-400" bg="bg-gray-800" />
          <SummaryCard label="Medium Risk" value={summary.mediumRisk || 0} color="text-yellow-400" bg="bg-gray-800" />
          <SummaryCard label="High Risk" value={summary.highRisk || 0} color="text-red-400" bg="bg-gray-800" />
          <SummaryCard label="Avg Attendance" value={`${summary.averageAttendance || 0}%`} color="text-cyan-400" bg="bg-gray-800" />
          <SummaryCard label="Avg CGPA" value={summary.averageCGPA || 0} color="text-purple-400" bg="bg-gray-800" />
          <SummaryCard label="Avg Marks" value={`${summary.averageMarks || 0}%`} color="text-indigo-400" bg="bg-gray-800" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 shadow-lg">
            <h3 className="font-bold text-sm text-gray-300 mb-4">Risk Distribution</h3>
            <div className="h-64">
              <Pie data={pieData} options={pieOptions} />
            </div>
          </div>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 shadow-lg">
            <h3 className="font-bold text-sm text-gray-300 mb-4">Attendance Ranges</h3>
            <div className="h-64">
              <Bar data={barData} options={barOptions} />
            </div>
          </div>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 shadow-lg">
            <h3 className="font-bold text-sm text-gray-300 mb-4">Marks Trend</h3>
            <div className="h-64">
              <Line data={lineData} options={lineOptions} />
            </div>
          </div>
        </div>

        {/* Risk Alerts */}
        {alerts.length > 0 && (
          <div className="bg-gray-900 rounded-2xl border-2 border-red-500/50 p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-bold text-lg text-red-400">
                Risk Alerts -- {alerts.length} High Risk Student{alerts.length !== 1 ? "s" : ""}
              </h2>
            </div>
            <p className="text-xs text-red-300 mb-4">
              Warning: These students require immediate faculty intervention
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {alerts.map((alert) => (
                <AlertCard key={alert.studentId} alert={alert} />
              ))}
            </div>
          </div>
        )}

        {/* Student Risk Table */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-base">All Student Risk Analysis</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Decision Tree ML predictions based on attendance, CGPA & marks
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className="text-sm px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Risks</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {filteredPredictions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>No students match the current filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-gray-400 text-left">
                    <th className="px-4 py-3 font-semibold">Student</th>
                    <th className="px-4 py-3 font-semibold">Department</th>
                    <th className="px-4 py-3 font-semibold text-center">Attendance %</th>
                    <th className="px-4 py-3 font-semibold text-center">CGPA</th>
                    <th className="px-4 py-3 font-semibold text-center">Avg Marks</th>
                    <th className="px-4 py-3 font-semibold text-center">Risk Level</th>
                    <th className="px-4 py-3 font-semibold text-center">Confidence</th>
                    <th className="px-4 py-3 font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPredictions.map((p) => (
                    <tr
                      key={p.studentId}
                      className={`border-t border-gray-800 hover:bg-gray-800/60 transition-colors ${
                        p.risk === "high" ? "bg-red-950/20" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.studentId}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{p.department || "--"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${p.attendancePct >= 75 ? "text-green-400" : "text-red-400"}`}>
                          {p.attendancePct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${p.cgpa >= 7 ? "text-green-400" : p.cgpa >= 5 ? "text-yellow-400" : "text-red-400"}`}>
                          {p.cgpa}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${p.avgMarks >= 60 ? "text-green-400" : p.avgMarks >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                          {p.avgMarks}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <RiskBadge risk={p.risk} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-gray-400 text-xs">
                          {((p.confidence || 0) * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-xs">{p.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Decision Tree Explanation */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-lg">
          <h2 className="font-bold text-base mb-4">ML Model: Decision Tree Classifier</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Input Features</h3>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>- Attendance Percentage</li>
                <li>- CGPA (0-10 scale)</li>
                <li>- Average Marks Percentage</li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Decision Rules</h3>
              <div className="text-xs text-gray-400 font-mono bg-gray-800 rounded-lg p-3 space-y-1">
                <p><span className="text-yellow-400">IF</span> attendance &lt; 50% <span className="text-red-400">-&gt; HIGH RISK</span></p>
                <p><span className="text-yellow-400">ELSE IF</span> attendance &lt; 75% AND cgpa &lt; 5 <span className="text-red-400">-&gt; HIGH RISK</span></p>
                <p><span className="text-yellow-400">ELSE IF</span> attendance &lt; 75% AND marks &lt; 40% <span className="text-red-400">-&gt; HIGH RISK</span></p>
                <p><span className="text-yellow-400">ELSE IF</span> attendance &lt; 75% <span className="text-yellow-400">-&gt; MEDIUM RISK</span></p>
                <p><span className="text-yellow-400">ELSE IF</span> cgpa &lt; 5 <span className="text-yellow-400">-&gt; MEDIUM RISK</span></p>
                <p><span className="text-yellow-400">ELSE IF</span> marks &lt; 60% <span className="text-yellow-400">-&gt; MEDIUM RISK</span></p>
                <p><span className="text-yellow-400">ELSE</span> <span className="text-green-400">-&gt; LOW RISK</span></p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
