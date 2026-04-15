import "./App.css";
import AddStudent from "./pages/AddStudent";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Student from "./pages/Student";
import Teacher from "./pages/Teacher";
import { Route, Routes } from "react-router-dom";
function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/Teacher" element={<Teacher />} />
        <Route path="/Student" element={<Student />} />
        <Route path="/AddStudent" element={<AddStudent />} />
        <Route path="/Dashboard" element={<Dashboard />} />
      </Routes>
    </>
  );
}

export default App;
