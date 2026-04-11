import "./App.css";
import AddStudent from "./pages/AddStudent";
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
      </Routes>
    </>
  );
}

export default App;
