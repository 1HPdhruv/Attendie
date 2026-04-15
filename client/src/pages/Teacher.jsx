import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// ─── Prediction Engine ───────────────────────────────────────────────────────
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
  const classesNeededFor75 = Math.max(0, requiredPresent);

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
    classesNeededFor75,
    projectedFinal: projectedFinal !== null ? +projectedFinal.toFixed(1) : null,
    atRisk: projectedFinal !== null && projectedFinal < 75,
    totalClasses: total,
    presentCount: present,
    absentCount: total - present,
    margin: +(currentPct - 75).toFixed(1),
  };
}

// ─── Decision Tree Risk Prediction ───────────────────────────────────────────
function predictRisk(attendancePct, cgpa, avgMarks) {
  if (attendancePct < 50) return { risk: "high", reason: "Attendance critically low (below 50%)" };
  if (attendancePct < 75) {
    if (cgpa < 5) return { risk: "high", reason: "Low attendance + low CGPA" };
    if (avgMarks < 40) return { risk: "high", reason: "Low attendance + failing marks" };
    return { risk: "medium", reason: "Attendance below 75%" };
  }
  if (cgpa < 5) return { risk: "medium", reason: "Good attendance but low CGPA" };
  if (avgMarks < 60) return { risk: "medium", reason: "Average marks below 60%" };
  return { risk: "low", reason: "Performing well" };
}

// ─── Risk Badge ──────────────────────────────────────────────────────────────
function RiskBadge({ risk }) {
  const m = {
    high: { label: "HIGH", cls: "bg-red-100 text-red-700" },
    medium: { label: "MEDIUM", cls: "bg-yellow-100 text-yellow-700" },
    low: { label: "LOW", cls: "bg-green-100 text-green-700" },
  };
  const { label, cls } = m[risk] || m.low;
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

// ─── Trend Pill ──────────────────────────────────────────────────────────────
function TrendPill({ trend }) {
  const map = {
    improving: { icon: "UP", cls: "text-green-600 bg-green-100" },
    declining: { icon: "DOWN", cls: "text-red-600 bg-red-100" },
    stable: { icon: "STABLE", cls: "text-yellow-600 bg-yellow-100" },
  };
  const { icon, cls } = map[trend] || map.stable;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>
      {icon}
    </span>
  );
}

// ─── At-Risk Panel ───────────────────────────────────────────────────────────
function AtRiskPanel({ students }) {
  const [open, setOpen] = useState(true);

  const atRisk = students
    .map((s) => {
      const pred = analyzeAttendance(s.attandance || s.attendance);
      const avgMarks = (s.marks || []).length
        ? +((s.marks || []).reduce((sum, m) => sum + (m.marksObtained / m.maxMarks) * 100, 0) / s.marks.length).toFixed(1)
        : 0;
      const riskResult = predictRisk(pred.currentPct, s.cgpa || 0, avgMarks);
      return { ...s, pred, avgMarks, riskResult };
    })
    .filter((s) => s.riskResult.risk === "high");

  if (atRisk.length === 0) {
    return (
      <div className="mb-6 bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-center gap-3">
        <div>
          <p className="font-semibold text-green-700 text-sm">All students are performing well!</p>
          <p className="text-green-600 text-xs">No high-risk students detected by the Decision Tree.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-red-500 text-white hover:bg-red-600 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-bold">
            High Risk Alerts -- {atRisk.length} student{atRisk.length !== 1 ? "s" : ""} need intervention
          </span>
        </div>
        <span className="text-sm opacity-80">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="p-4 space-y-3">
          {atRisk.map((s) => (
            <div key={s.id} className="bg-white border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <div className="flex-1">
                <p className="font-bold text-red-800 text-sm">
                  {s.name} <span className="text-red-400 font-normal">({s.id})</span>
                </p>
                <p className="text-red-600 text-xs mt-1">
                  Warning: Student at High Academic Risk. Immediate faculty intervention required.
                </p>
                <div className="flex gap-4 mt-2 text-xs text-red-500">
                  <span>Attendance: {s.pred.currentPct}%</span>
                  <span>CGPA: {s.cgpa || 0}</span>
                  <span>Marks: {s.avgMarks}%</span>
                  <span>{s.riskResult.reason}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add Student Modal ───────────────────────────────────────────────────────
function AddStudentModal({ onClose, onAdd, token }) {
  const [form, setForm] = useState({
    name: "",
    password: "",
    email: "",
    phone_no: "",
    department: "",
    admission_year: new Date().getFullYear(),
    cgpa: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const handleSubmit = async () => {
    if (!form.name || !form.password) {
      setError("Name and password are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/AddStudent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, attandance: {} }),
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-bold text-lg mb-4 text-gray-800">Add New Student</h2>

        {success ? (
          <div className="text-center py-4">
            <p className="text-green-600 font-semibold text-lg mb-1">Student added!</p>
            <p className="text-gray-600 text-sm">ID: <strong>{success.id || "Generated"}</strong></p>
            <div className="flex gap-3 mt-5 justify-center">
              <button
                onClick={() => { setSuccess(null); setForm({ name: "", password: "", email: "", phone_no: "", department: "", admission_year: new Date().getFullYear(), cgpa: 0 }); }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
              >Add Another</button>
              <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 text-gray-700">Close</button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <input type="text" placeholder="Student Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-800" />
              <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-800" />
              <input type="text" placeholder="Phone Number" value={form.phone_no} onChange={(e) => setForm({ ...form, phone_no: e.target.value })}
                className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-800" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Department (e.g. CSE)" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-800" />
                <input type="number" placeholder="Admission Year" value={form.admission_year} onChange={(e) => setForm({ ...form, admission_year: +e.target.value })}
                  className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-800" />
              </div>
              <input type="number" placeholder="CGPA (0-10)" step="0.1" min="0" max="10" value={form.cgpa} onChange={(e) => setForm({ ...form, cgpa: +e.target.value })}
                className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-800" />
              <input type="password" placeholder="Password *" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-800" />
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-600 disabled:opacity-60">
                {loading ? "Adding..." : "Add Student"}
              </button>
              <button onClick={onClose} className="px-4 py-2.5 border rounded-lg text-sm hover:bg-gray-50 text-gray-700">Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Add Marks Modal ─────────────────────────────────────────────────────────
function AddMarksModal({ student, onClose, onSave, token }) {
  const [form, setForm] = useState({
    subject: "",
    examType: "internal",
    marksObtained: "",
    maxMarks: 100,
    semester: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!form.subject || form.marksObtained === "") {
      setError("Subject and marks are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/marks/${student.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          marksObtained: +form.marksObtained,
          maxMarks: +form.maxMarks,
          semester: +form.semester,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add marks");
      setSuccess(true);
      if (onSave) onSave(student.id, data.marks);
      setTimeout(() => {
        setSuccess(false);
        setForm({ subject: "", examType: "internal", marksObtained: "", maxMarks: 100, semester: 1 });
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="font-bold text-lg mb-1 text-gray-800">Add Marks</h2>
        <p className="text-sm text-gray-500 mb-4">For: <strong>{student.name}</strong> ({student.id})</p>

        {success ? (
          <div className="text-center py-6">
            <p className="text-green-600 font-semibold text-lg">Marks added successfully!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <input type="text" placeholder="Subject (e.g. Mathematics)" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-800" />
            <select value={form.examType} onChange={(e) => setForm({ ...form, examType: e.target.value })}
              className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-800">
              <option value="internal">Internal</option>
              <option value="midterm">Midterm</option>
              <option value="final">Final</option>
              <option value="assignment">Assignment</option>
              <option value="practical">Practical</option>
            </select>
            <div className="grid grid-cols-3 gap-3">
              <input type="number" placeholder="Marks" value={form.marksObtained} onChange={(e) => setForm({ ...form, marksObtained: e.target.value })}
                className="border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-800" />
              <input type="number" placeholder="Max Marks" value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })}
                className="border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-800" />
              <input type="number" placeholder="Semester" value={form.semester} min="1" max="8" onChange={(e) => setForm({ ...form, semester: e.target.value })}
                className="border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-800" />
            </div>
          </div>
        )}

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <div className="flex gap-3 mt-5">
          {!success && (
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-600 disabled:opacity-60">
              {loading ? "Adding..." : "Add Marks"}
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2.5 border rounded-lg text-sm hover:bg-gray-50 text-gray-700">
            {success ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CGPA Edit Modal ─────────────────────────────────────────────────────────
function CGPAModal({ student, onClose, onSave, token }) {
  const [cgpa, setCgpa] = useState(student.cgpa || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (cgpa < 0 || cgpa > 10) {
      setError("CGPA must be between 0 and 10");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/marks/${student.id}/cgpa`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cgpa: +cgpa }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      onSave(student.id, +cgpa);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="font-bold text-lg mb-1 text-gray-800">Update CGPA</h2>
        <p className="text-sm text-gray-500 mb-4">For: <strong>{student.name}</strong></p>
        <input type="number" step="0.1" min="0" max="10" value={cgpa} onChange={(e) => setCgpa(e.target.value)}
          className="w-full border rounded-lg px-4 py-3 text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-800" />
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={handleSave} disabled={loading}
            className="flex-1 bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-600 disabled:opacity-60">
            {loading ? "Saving..." : "Save CGPA"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 border rounded-lg text-sm hover:bg-gray-50 text-gray-700">Cancel</button>
        </div>
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
  const [activeTab, setActiveTab] = useState("attendance");
  const [marksTarget, setMarksTarget] = useState(null);
  const [cgpaTarget, setCgpaTarget] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [expandedMarks, setExpandedMarks] = useState(new Set());

  // Collect all unique dates across all students
  const allDates = [
    ...new Set(
      students.flatMap((s) => Object.keys(s.attandance || s.attendance || {}))
    ),
  ].sort();

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    fetch(`${import.meta.env.VITE_API_URL}/Teacher`, {
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
        (s.id || s.studentId) === studentId
          ? { ...s, attandance: { ...(s.attandance || s.attendance), [date]: value } }
          : s
      )
    );
  };

  const handleAddDate = () => {
    if (!newDate) return;
    if (allDates.includes(newDate)) {
      setNewDate("");
      return;
    }
    // Add empty attendance for this date to all students
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        attandance: { ...(s.attandance || s.attendance || {}), [newDate]: "" },
      }))
    );
    setNewDate("");
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      const update = students.map((s) => ({
        id: s.id || s.studentId,
        attandance: s.attandance || s.attendance || {},
      }));
      await fetch(`${import.meta.env.VITE_API_URL}/Teacher`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(update),
      });
      setSaveMsg("Saved successfully!");
    } catch {
      setSaveMsg("Save failed. Please try again.");
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
      const ids = [...selected];
      await fetch(`${import.meta.env.VITE_API_URL}/Teacher`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(ids),
      });
      setStudents((prev) => prev.filter((s) => !selected.has(s.id || s.studentId)));
      setSelected(new Set());
    } catch {
      alert("Failed to delete some students. Please try again.");
    }
  };

  const handleMarksAdded = (studentId, marks) => {
    setStudents((prev) =>
      prev.map((s) =>
        (s.id || s.studentId) === studentId ? { ...s, marks } : s
      )
    );
  };

  const handleCGPASaved = (studentId, newCgpa) => {
    setStudents((prev) =>
      prev.map((s) =>
        (s.id || s.studentId) === studentId ? { ...s, cgpa: newCgpa } : s
      )
    );
  };

  const toggleMarksExpand = (sid) => {
    setExpandedMarks((prev) => {
      const next = new Set(prev);
      next.has(sid) ? next.delete(sid) : next.add(sid);
      return next;
    });
  };

  // ── Styling ──────────────────────────────────────────────────────────────
  const bg = darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900";
  const card = darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
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
          <p className="text-red-600 font-semibold">{error}</p>
          <button onClick={() => navigate("/")} className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg text-sm">Go to login</button>
        </div>
      </div>
    );
  }

  const tabs = ["attendance", "risk", "marks", "cgpa"];
  const tabLabels = {
    attendance: "Attendance",
    risk: "Risk Analysis",
    marks: "Marks",
    cgpa: "CGPA",
  };

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      {/* ── Navbar */}
      <nav className={`${card} border-b px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10`}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">Smart Attendance</span>
          <span className={`text-xs ${sub} ml-2`}>
            Teacher Dashboard | {students.length} student{students.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate("/Dashboard")}
            className="text-sm px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
            Risk Dashboard
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="text-sm px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            + Add Student
          </button>
          {selected.size > 0 && (
            <button onClick={handleDeleteSelected}
              className="text-sm px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
              Delete ({selected.size})
            </button>
          )}
          <button onClick={handleSave} disabled={saving}
            className="text-sm px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-60">
            {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={() => setDarkMode(!darkMode)}
            className={`text-sm px-3 py-1.5 rounded-lg border ${card} hover:opacity-80`}>
            {darkMode ? "Light" : "Dark"}
          </button>
          <button onClick={handleLogout}
            className="text-sm px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
            Logout
          </button>
        </div>
      </nav>

      {/* ── Save feedback */}
      {saveMsg && (
        <div className="text-center py-2 text-sm font-medium bg-green-50 border-b border-green-200 text-green-700">
          {saveMsg}
        </div>
      )}

      {/* ── Main Content */}
      <main className="max-w-full px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-semibold capitalize rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "bg-blue-500 text-white"
                  : `${sub} hover:text-gray-700`
              }`}>
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        {/* ── Tab: Attendance */}
        {activeTab === "attendance" && (
          <div>
            {/* Add date input */}
            <div className="flex items-center gap-3 mb-4">
              <label className={`text-sm font-semibold ${sub}`}>Add Date:</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-800"
              />
              <button
                onClick={handleAddDate}
                disabled={!newDate}
                className="text-sm px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                Add Date Column
              </button>
            </div>

            <div className={`${card} border rounded-2xl shadow-sm overflow-hidden`}>
              {students.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <p className="font-semibold">No students yet.</p>
                  <p className="text-sm mt-1">Click "Add Student" to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={tableTh}>
                        <th className="px-4 py-3 font-semibold text-left sticky left-0 z-10 bg-inherit">
                          <input type="checkbox"
                            checked={selected.size === students.length}
                            onChange={() => setSelected(
                              selected.size === students.length
                                ? new Set()
                                : new Set(students.map((s) => s.id || s.studentId))
                            )}
                            className="mr-2" />
                          Student
                        </th>
                        <th className="px-3 py-3 font-semibold text-center">%</th>
                        {allDates.map((date) => (
                          <th key={date} className="px-2 py-3 font-semibold text-center whitespace-nowrap">{date}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => {
                        const sid = s.id || s.studentId;
                        const att = s.attandance || s.attendance || {};
                        const pct = analyzeAttendance(att).currentPct;
                        return (
                          <tr key={sid} className={`border-t ${tableTr} transition-colors`}>
                            <td className={`px-4 py-3 sticky left-0 z-10 ${card} font-medium`}>
                              <input type="checkbox" checked={selected.has(sid)} onChange={() => toggleSelect(sid)} className="mr-2" />
                              <span>{s.name}</span>
                              <span className={`block text-xs ${sub}`}>{sid}</span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${
                                pct >= 75 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                              }`}>{pct}%</span>
                            </td>
                            {allDates.map((date) => {
                              const val = att[date] || "";
                              return (
                                <td key={date} className="px-2 py-3 text-center">
                                  <select value={val} onChange={(e) => handleAttendanceChange(sid, date, e.target.value)}
                                    className={`text-xs rounded px-1 py-0.5 border font-semibold focus:outline-none ${
                                      val === "P" ? "bg-green-100 text-green-700 border-green-300"
                                      : val === "A" ? "bg-red-100 text-red-600 border-red-300"
                                      : "bg-gray-100 text-gray-400 border-gray-300"
                                    }`}>
                                    <option value="">--</option>
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
          </div>
        )}

        {/* ── Tab: Risk Analysis */}
        {activeTab === "risk" && (
          <div>
            <AtRiskPanel students={students} />

            <div className={`${card} border rounded-2xl shadow-sm overflow-hidden`}>
              <div className="px-5 py-4 border-b">
                <h2 className="font-bold text-base">ML Risk Predictions (Decision Tree)</h2>
                <p className={`text-xs ${sub} mt-0.5`}>
                  Based on Attendance%, CGPA & Average Marks -- Classified as Low / Medium / High Risk
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={tableTh}>
                      <th className="px-4 py-3 text-left font-semibold">Student</th>
                      <th className="px-4 py-3 text-center font-semibold">Dept</th>
                      <th className="px-4 py-3 text-center font-semibold">Attendance</th>
                      <th className="px-4 py-3 text-center font-semibold">Att. Margin</th>
                      <th className="px-4 py-3 text-center font-semibold">Classes Needed</th>
                      <th className="px-4 py-3 text-center font-semibold">CGPA</th>
                      <th className="px-4 py-3 text-center font-semibold">Avg Marks</th>
                      <th className="px-4 py-3 text-center font-semibold">Marks to Pass</th>
                      <th className="px-4 py-3 text-center font-semibold">Risk Level</th>
                      <th className="px-4 py-3 text-left font-semibold">Reason</th>
                      <th className="px-4 py-3 text-center font-semibold">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students
                      .map((s) => {
                        const att = s.attandance || s.attendance || {};
                        const pred = analyzeAttendance(att);
                        const marks = s.marks || [];
                        const avgMarks = marks.length
                          ? +(marks.reduce((sum, m) => sum + (m.marksObtained / m.maxMarks) * 100, 0) / marks.length).toFixed(1)
                          : 0;
                        const riskResult = predictRisk(pred.currentPct, s.cgpa || 0, avgMarks);
                        const marksToPass = avgMarks >= 40 ? 0 : +(40 - avgMarks).toFixed(1);
                        return { ...s, pred, avgMarks, riskResult, marksToPass };
                      })
                      .sort((a, b) => {
                        const riskOrder = { high: 0, medium: 1, low: 2 };
                        return riskOrder[a.riskResult.risk] - riskOrder[b.riskResult.risk];
                      })
                      .map((s) => (
                        <tr key={s.id || s.studentId} className={`border-t ${tableTr} transition-colors ${
                          s.riskResult.risk === "high" ? (darkMode ? "bg-red-950/30" : "bg-red-50/50") : ""
                        }`}>
                          <td className="px-4 py-3">
                            <p className="font-medium">{s.name}</p>
                            <p className={`text-xs ${sub}`}>{s.id || s.studentId}</p>
                          </td>
                          <td className="px-4 py-3 text-center text-xs">{s.department || "--"}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${s.pred.currentPct >= 75 ? "text-green-600" : "text-red-600"}`}>
                              {s.pred.currentPct}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${
                              s.pred.margin >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}>
                              {s.pred.margin >= 0 ? "+" : ""}{s.pred.margin}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {s.pred.classesNeededFor75 > 0 ? (
                              <span className="text-red-600 font-bold text-xs">{s.pred.classesNeededFor75} more</span>
                            ) : (
                              <span className="text-green-600 font-bold text-xs">Met</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${(s.cgpa || 0) >= 7 ? "text-green-600" : (s.cgpa || 0) >= 5 ? "text-yellow-600" : "text-red-600"}`}>
                              {s.cgpa || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${s.avgMarks >= 60 ? "text-green-600" : s.avgMarks >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                              {s.avgMarks}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {s.marksToPass > 0 ? (
                              <span className="text-red-600 font-bold text-xs">+{s.marksToPass}% needed</span>
                            ) : (
                              <span className="text-green-600 font-bold text-xs">Passing</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <RiskBadge risk={s.riskResult.risk} />
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{s.riskResult.reason}</td>
                          <td className="px-4 py-3 text-center">
                            <TrendPill trend={s.pred.trend} />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Marks Management */}
        {activeTab === "marks" && (
          <div className={`${card} border rounded-2xl shadow-sm overflow-hidden`}>
            <div className="px-5 py-4 border-b">
              <h2 className="font-bold text-base">Marks Management</h2>
              <p className={`text-xs ${sub} mt-0.5`}>Add and view marks for each student. Click a row to expand and view individual entries.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={tableTh}>
                    <th className="px-4 py-3 text-left font-semibold">Student</th>
                    <th className="px-4 py-3 text-center font-semibold">Total Entries</th>
                    <th className="px-4 py-3 text-center font-semibold">Avg Marks %</th>
                    <th className="px-4 py-3 text-center font-semibold">Subjects</th>
                    <th className="px-4 py-3 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const sid = s.id || s.studentId;
                    const marks = s.marks || [];
                    const avgMarks = marks.length
                      ? +(marks.reduce((sum, m) => sum + (m.marksObtained / m.maxMarks) * 100, 0) / marks.length).toFixed(1)
                      : 0;
                    const subjects = [...new Set(marks.map((m) => m.subject))];
                    const isExpanded = expandedMarks.has(sid);
                    return (
                      <>
                        <tr key={sid} className={`border-t ${tableTr} transition-colors cursor-pointer`} onClick={() => marks.length > 0 && toggleMarksExpand(sid)}>
                          <td className="px-4 py-3">
                            <p className="font-medium">{s.name}</p>
                            <p className={`text-xs ${sub}`}>{sid}</p>
                          </td>
                          <td className="px-4 py-3 text-center font-bold">{marks.length}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${avgMarks >= 60 ? "text-green-600" : avgMarks >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                              {avgMarks}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-gray-500">
                            {subjects.length > 0 ? subjects.join(", ") : "No marks yet"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={(e) => { e.stopPropagation(); setMarksTarget(s); }}
                              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 transition-colors">
                              + Add Marks
                            </button>
                            {marks.length > 0 && (
                              <button onClick={(e) => { e.stopPropagation(); toggleMarksExpand(sid); }}
                                className="ml-2 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-300 transition-colors">
                                {isExpanded ? "Hide" : "View"}
                              </button>
                            )}
                          </td>
                        </tr>
                        {isExpanded && marks.length > 0 && (
                          <tr key={`${sid}-details`}>
                            <td colSpan={5} className="px-6 py-3 bg-gray-50">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-500 border-b">
                                    <th className="px-3 py-2 text-left font-semibold">Subject</th>
                                    <th className="px-3 py-2 text-center font-semibold">Exam Type</th>
                                    <th className="px-3 py-2 text-center font-semibold">Marks</th>
                                    <th className="px-3 py-2 text-center font-semibold">Percentage</th>
                                    <th className="px-3 py-2 text-center font-semibold">Semester</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {marks.map((m, i) => {
                                    const pct = +((m.marksObtained / m.maxMarks) * 100).toFixed(1);
                                    return (
                                      <tr key={i} className="border-t border-gray-200">
                                        <td className="px-3 py-2 font-medium text-gray-800">{m.subject}</td>
                                        <td className="px-3 py-2 text-center">
                                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full capitalize">{m.examType}</span>
                                        </td>
                                        <td className="px-3 py-2 text-center font-bold text-gray-800">{m.marksObtained} / {m.maxMarks}</td>
                                        <td className="px-3 py-2 text-center">
                                          <span className={`font-bold ${pct >= 60 ? "text-green-600" : pct >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                                            {pct}%
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-center text-gray-600">Sem {m.semester || 1}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab: CGPA Management */}
        {activeTab === "cgpa" && (
          <div className={`${card} border rounded-2xl shadow-sm overflow-hidden`}>
            <div className="px-5 py-4 border-b">
              <h2 className="font-bold text-base">CGPA Management</h2>
              <p className={`text-xs ${sub} mt-0.5`}>View and update CGPA for each student. Click "Edit" to modify.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={tableTh}>
                    <th className="px-4 py-3 text-left font-semibold">Student</th>
                    <th className="px-4 py-3 text-center font-semibold">Department</th>
                    <th className="px-4 py-3 text-center font-semibold">Admission Year</th>
                    <th className="px-4 py-3 text-center font-semibold">Current CGPA</th>
                    <th className="px-4 py-3 text-center font-semibold">Risk Impact</th>
                    <th className="px-4 py-3 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const cgpa = s.cgpa || 0;
                    const cgpaColor = cgpa >= 7 ? "text-green-600" : cgpa >= 5 ? "text-yellow-600" : "text-red-600";
                    return (
                      <tr key={s.id || s.studentId} className={`border-t ${tableTr} transition-colors`}>
                        <td className="px-4 py-3">
                          <p className="font-medium">{s.name}</p>
                          <p className={`text-xs ${sub}`}>{s.id || s.studentId}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-sm">{s.department || "--"}</td>
                        <td className="px-4 py-3 text-center text-sm">{s.admission_year || "--"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xl font-extrabold ${cgpaColor}`}>{cgpa}</span>
                          <span className="text-xs text-gray-400"> / 10</span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs">
                          {cgpa < 5 ? (
                            <span className="text-red-600 font-semibold">Below threshold (5.0)</span>
                          ) : cgpa < 7 ? (
                            <span className="text-yellow-600 font-semibold">Moderate</span>
                          ) : (
                            <span className="text-green-600 font-semibold">Good</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => setCgpaTarget(s)}
                            className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs hover:bg-purple-600 transition-colors">
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ── Modals */}
      {showAddModal && (
        <AddStudentModal
          token={token}
          onClose={() => setShowAddModal(false)}
          onAdd={(newStudent) => setStudents((prev) => [...prev, newStudent])}
        />
      )}
      {marksTarget && (
        <AddMarksModal
          student={marksTarget}
          token={token}
          onClose={() => setMarksTarget(null)}
          onSave={handleMarksAdded}
        />
      )}
      {cgpaTarget && (
        <CGPAModal
          student={cgpaTarget}
          token={token}
          onClose={() => setCgpaTarget(null)}
          onSave={handleCGPASaved}
        />
      )}
    </div>
  );
}
