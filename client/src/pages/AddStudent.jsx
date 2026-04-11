import React from "react";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const AddStudent = () => {
  const formRef = useRef(null);
  const navigate = useNavigate();
  const handleSubmit = (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const student_data = Object.fromEntries(data.entries());
    student_data.attandance = {};
    const token = localStorage.getItem("token");
    fetch(`${import.meta.env.VITE_API_URL}/AddStudent`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(student_data),
    })
      .then((response) => response.json())
      .then((res) => {
        console.log(res);

        formRef.current.reset();
        res
          ? Swal.fire({
              title: "Student added the successfully !",
              text: "Click Ok  to navigate to -> dashboard ",
              buttons: true,
              showCancelButton: true,
            }).then((result) => {
              result.isConfirmed ? navigate("/Teacher") : null;
            })
          : null;
      });
  };

  return (
    <div className="flex flex-col items-center">
      <div className="w-full flex flex-row justify-start">
        <button
          onClick={() => navigate("/Teacher")}
          className="bg-blue-600 hover:bg-blue-700 cursor-pointer text-white rounded-xl p-2 font-bold w-fit mt-4"
        >
          Back
        </button>
      </div>
      <h1 className="font-bold text-[24px]">Add new Student</h1>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex flex-col items-start gap-2 mt-6"
      >
        <label htmlFor="">Name</label>
        <input
          name="name"
          type="text"
          className="border-1 border-gray-600  rounded-xl w-fit p-2"
          placeholder="enter name of the student"
          required
        />
        <label htmlFor="">Email</label>
        <input
          name="email"
          type="email"
          className="border-1 border-gray-600  rounded-xl w-fit p-2"
          placeholder="example@email.com"
          required
        />

        <label htmlFor="">Phone No</label>
        <input
          name="phone_no"
          type="text"
          className="border-1 border-gray-600  rounded-xl w-fit p-2"
          placeholder="+91 ..."
          required
        />

        <label htmlFor="">Password</label>
        <input
          name="password"
          type="text"
          className="border-1 border-gray-600  rounded-xl w-fit p-2"
          placeholder="enter a password"
          required
        />
        <button
          className="bg-blue-600 hover:bg-blue-700 cursor-pointer text-white rounded-xl p-2 font-bold w-full mt-4"
          type="submit"
        >
          Add student
        </button>
      </form>
    </div>
  );
};

export default AddStudent;
