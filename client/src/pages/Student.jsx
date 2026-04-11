import React from "react";
import { useState } from "react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";

const Student = () => {
  const navigate = useNavigate();
  const [student, setStudent_data] = useState({
    name: "",
    email: "",
    phone_no: "",
    student_id: "",
    attandance: {},
  });
  const st_id = useLocation().state;

  const start = "20/1/2025";
  const end = "30/1/2025";

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${import.meta.env.VITE_API_URL}/Student?std_id=${st_id.id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          window.alert("error in authentication not a valid jwt token");
          navigate("/");
          throw new Error("authenticaion error");
        } else {
          return response.json();
        }
      })
      .then((data) => {
        setStudent_data(data);
      });
    console.log("fetched");
  }, []);
  const parse = (date) => {
    const [day, month] = date.split("/").map(Number);
    return new Date(2025, month - 1, day);
  };
  const attandance_percentage = (start, end) => {
    const start_date = parse(start);
    const end_date = parse(end);
    const diffms = end_date - start_date;
    const ms = 1000 * 60 * 60 * 24;
    const diffday = diffms / ms;
    const total_days = Math.round(diffday);
    const present_days = Object.values(student.attandance).filter(
      (item) => item == "P"
    ).length;
    console.log(present_days, total_days);

    const percentage = (present_days / total_days) * 100;

    return percentage;
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 ">
      <h1 className="font-bold mt-12 text-[32px] text-gray-400">
        Welcome {student.name}!
      </h1>
      <h3 className="font-semibold mt-4">Student info</h3>
      <table>
        <tr>
          <td className="vertical-header border boder-2 border-white p-2 w-fit">
            Name
          </td>
          <td className="vertical-header border boder-2 border-white p-2  font-normal w-fit">
            {student.name}
          </td>
        </tr>
        <tr>
          <td className="vertical-header border boder-2 border-white p-2 w-fit">
            Email
          </td>
          <td className="vertical-header border boder-2 border-white p-2  font-normal w-fit">
            {student.email}
          </td>
        </tr>
        <tr>
          <td className="vertical-header border boder-2 border-white p-2 w-fit">
            Phone
          </td>
          <td className="vertical-header border boder-2 border-white p-2  font-normal w-fit">
            {student.phone_no}
          </td>
        </tr>
      </table>
      <h3 className="font-semibold">
        Total attandance : {attandance_percentage(start, end)}%
      </h3>
      <Link
        to={"/"}
        className="bg-red-600 mt-4 text-white rounded-xl p-2 font-bold"
      >
        Log out
      </Link>
    </div>
  );
};

export default Student;
