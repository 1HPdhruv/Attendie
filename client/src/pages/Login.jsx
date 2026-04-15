import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";

const Login = () => {
  const [user, setUser] = useState("Student");
  const [load, setLoad] = useState(false);
  const [count, setCount] = useState(30);
  const [showpassword, setShowpassword] = useState(true);
  const navigate = useNavigate();

  // ✅ Check backend is alive (only once)
  useEffect(() => {
    fetch(apiUrl("/"))
      .then((res) => {
        if (res.ok) setLoad(true);
      })
      .catch((err) => {
        console.log(`Error connecting to backend: ${err}`);
      });
  }, []);

  // ⏳ Countdown logic
  useEffect(() => {
    if (!load && count > 0) {
      const interval = setInterval(() => {
        setCount((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [count, load]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const data = new FormData(e.target);
    const id = data.get("userid");
    const password = data.get("password");

    fetch(apiUrl("/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, password, user }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Invalid Credentials");
        }
        return response.json();
      })
      .then((permission) => {
        localStorage.setItem("token", permission.token);
        navigate(`/${user}`, { state: { studentId: id } });
      })
      .catch((err) => {
        alert(`Error from server: ${err.message}`);
      });
  };

  return (
    <>
      {load ? (
        <div className="flex flex-col items-center justify-center">
          <h1 className="font-semibold text-[24px] text-gray-400 mb-12">
            Welcome to Student attendance
            <br /> management login to proceed!
          </h1>

          <div className="flex flex-row gap-5 mt-4 mb-8">
            <button
              className={`${
                user === "Student"
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-300"
              } p-3 rounded-xl font-bold`}
              onClick={() => {
                setUser("Student");
                document.getElementById("loginform").reset();
              }}
            >
              Student
            </button>

            <button
              className={`${
                user === "Teacher"
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-300"
              } p-3 rounded-xl font-bold`}
              onClick={() => {
                setUser("Teacher");
                document.getElementById("loginform").reset();
              }}
            >
              Teacher
            </button>
          </div>

          <h1 className="font-bold text-xl mt-2">Login as {user}</h1>

          <form
            id="loginform"
            onSubmit={handleSubmit}
            className="flex flex-col items-start mt-4"
          >
            <label>{user} Id</label>
            <input
              name="userid"
              type="text"
              className="rounded-xl border mt-2 p-2"
              placeholder="Enter ID"
              required
            />

            <label className="mt-2">Password</label>
            <div className="flex flex-row items-center">
              <input
                name="password"
                type={showpassword ? "password" : "text"}
                className="rounded-xl border mt-2 p-2"
                placeholder="Password"
                required
              />

              <span
                onClick={() => setShowpassword(!showpassword)}
                className="cursor-pointer ml-2"
              >
                Show
              </span>
            </div>

            <button
              className="bg-blue-600 p-3 rounded-xl hover:bg-blue-700 text-white font-bold w-full mt-4"
              type="submit"
            >
              Login
            </button>
          </form>
        </div>
      ) : (
        <div className="flex justify-center items-center bg-gray-700 text-white p-4">
          Server is waking up (free tier)...
          <span className="ml-2 font-bold">{count}</span>
        </div>
      )}
    </>
  );
};

export default Login;
