import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [user, setUser] = useState("Student");
  const [load, setLoad] = useState(false);
  const [count, setCount] = useState(30);
  const [showpassword, setShowpassword] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(import.meta.env.VITE_API_URL, {
      method: "GET",
    })
      .then((res) => {
        setLoad(res);
      })
      .catch((err) => {
        console.log(`error occured in the backend${err}`);
      });
    if (!load) {
      if (count <= 0) {
        return;
      }
      const interval = setInterval(() => {
        setCount((perv) => perv - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [count]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const id = data.get("userid");
    const password = data.get("password");
    console.log("executed");
    console.log(JSON.stringify({ hello: "hello" }));

    fetch(import.meta.env.VITE_API_URL, {
      method: "POST",
      headers: {
        "content-Type": "application/json",
      },
      body: JSON.stringify({ id: id, password: password, user: user }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Invalid Credential");
        } else {
          return response.json();
        }
      })
      .then((permision) => {
        localStorage.setItem("token", permision.token);
        navigate(`/${user}`, { state: { id } });
      })
      .catch((err) => {
        window.alert(
          `error from server :${err} restart the or start the server`
        );
      });
  };

  return (
    <>
      {" "}
      {load ? (
        <div className="flex flex-col items-center justify-center">
          <h1 className="font-semibold text-[24px] text-gray-400 mb-12">
            Welcome to Student attandance<br></br> management login to proceed !
          </h1>
          <div className="flex flex-row gap-5 mt-4 mb-8  w-fit justify-stretch ">
            <button
              className={`${user == "Student"
                  ? "bg-blue-600 border-0 hover:bg-blue-700 cursor-pointer text-white"
                  : "hover:bg-gray-300"
                }  border-[1.5px] border-white p-3 rounded-xl  cursor-pointer text-white font-bold`}
              onClick={() => {
                setUser("Student");
                document.getElementById("loginform").reset();
              }}
            >
              Student
            </button>
            <button
              className={`${user == "Teacher"
                  ? "bg-blue-600 hover:bg-blue-700 cursor-pointer border-0 text-white"
                  : "hover:bg-gray-300"
                } border-[1.5px] border-white p-3   cursor-pointer rounded-xl text-white font-bold`}
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
            <label htmlFor="">{user} Id</label>
            <input
              name="userid"
              type="text"
              className="rounded-xl border-1 mt-2 border-white p-2"
              placeholder="enter the id"
              required
            />
            <label htmlFor="" className="mt-2">
              Password
            </label>
            <div className="flex flex-row items-center justify-center">
              <input
                name="password"
                type={showpassword ? "password" : "text"}
                className="rounded-xl border-1 mt-2 border-white p-2"
                placeholder="password"
                required
              />
              <span
                onClick={() => {
                  setShowpassword(!showpassword);
                }}
                className="absolute cursor-pointer left-[70%] sm:left-[55%]"
              >
                <svg
                  fill="#ffff"
                  version="1.1"
                  id="Layer_1"
                  xmlns="http://www.w3.org/2000/svg"
                  xmlns:xlink="http://www.w3.org/1999/xlink"
                  width="24px"
                  height="24px"
                  viewBox="0 0 72 72"
                  enable-background="new 0 0 72 72"
                  xml:space="preserve"
                >
                  <g>
                    <g>
                      <path
                        d="M36.001,63.75C24.233,63.75,2.5,54.883,2.5,42.25c0-12.634,21.733-21.5,33.501-21.5c11.766,0,33.5,8.866,33.5,21.5
			C69.501,54.883,47.767,63.75,36.001,63.75z M36.001,24.75C24.886,24.75,6.5,32.929,6.5,42.25c0,9.32,18.387,17.5,29.501,17.5
			c11.113,0,29.5-8.18,29.5-17.5C65.501,32.929,47.114,24.75,36.001,24.75z"
                      />
                    </g>
                    <g>
                      <path
                        d="M36.001,52.917c-5.791,0-10.501-4.709-10.501-10.5c0-5.79,4.711-10.5,10.501-10.5c5.789,0,10.5,4.71,10.5,10.5
			C46.501,48.208,41.79,52.917,36.001,52.917z M36.001,33.917c-4.688,0-8.501,3.814-8.501,8.5c0,4.688,3.813,8.5,8.501,8.5
			c4.686,0,8.5-3.813,8.5-8.5C44.501,37.731,40.687,33.917,36.001,33.917z"
                      />
                    </g>
                    <g>
                      <path
                        d="M32.073,39.809c-0.242,0-0.484-0.088-0.677-0.264c-0.406-0.375-0.433-1.008-0.059-1.414
			c0.2-0.217,0.415-0.422,0.644-0.609c0.428-0.352,1.058-0.291,1.408,0.137c0.352,0.426,0.29,1.057-0.136,1.408
			c-0.158,0.129-0.307,0.27-0.444,0.418C32.612,39.7,32.342,39.809,32.073,39.809z"
                      />
                    </g>
                    <g>
                      <path
                        d="M36.001,48.75c-3.494,0-6.335-2.842-6.335-6.334c0-0.553,0.448-1,1-1c0.553,0,1,0.447,1,1
			c0,2.391,1.945,4.334,4.335,4.334c0.553,0,1,0.447,1,1S36.554,48.75,36.001,48.75z"
                      />
                    </g>
                    <g>
                      <path
                        d="M35.876,18.25c-1.105,0-2-0.896-2-2v-6c0-1.104,0.895-2,2-2c1.104,0,2,0.896,2,2v6
			C37.876,17.354,36.979,18.25,35.876,18.25z"
                      />
                    </g>
                    <g>
                      <path
                        d="M24.353,18.93c-0.732,0-1.437-0.402-1.788-1.101l-1.852-3.68c-0.497-0.987-0.1-2.189,0.888-2.686
			c0.985-0.498,2.188-0.101,2.686,0.887l1.852,3.68c0.496,0.987,0.099,2.189-0.888,2.686C24.962,18.861,24.655,18.93,24.353,18.93z"
                      />
                    </g>
                    <g>
                      <path
                        d="M12.684,23.567c-0.548,0-1.094-0.224-1.488-0.663l-2.6-2.894c-0.738-0.822-0.671-2.087,0.151-2.824
			c0.82-0.74,2.085-0.672,2.824,0.15l2.6,2.894c0.738,0.822,0.67,2.087-0.151,2.824C13.638,23.398,13.16,23.567,12.684,23.567z"
                      />
                    </g>
                    <g>
                      <path
                        d="M46.581,18.93c-0.303,0-0.609-0.068-0.898-0.214c-0.986-0.496-1.383-1.698-0.887-2.686l1.852-3.68
			c0.494-0.985,1.695-1.386,2.686-0.887c0.986,0.496,1.385,1.698,0.887,2.686l-1.852,3.68C48.019,18.527,47.313,18.93,46.581,18.93z
			"
                      />
                    </g>
                    <g>
                      <path
                        d="M58.249,23.567c-0.475,0-0.953-0.169-1.336-0.513c-0.82-0.737-0.889-2.002-0.15-2.824l2.6-2.894
			c0.738-0.82,2.002-0.89,2.824-0.15c0.822,0.737,0.889,2.002,0.15,2.824l-2.6,2.894C59.343,23.344,58.798,23.567,58.249,23.567z"
                      />
                    </g>
                  </g>
                </svg>
              </span>
            </div>
            <button
              className="bg-blue-600 p-3 rounded-xl hover:bg-blue-700 cursor-pointer text-white font-bold w-full mt-4"
              type="submit"
            >
              Login
            </button>
          </form>
        </div>
      ) : (
        <div className=" flex flex-row justify-center items-center bg-gray-700 text-white ">
          Sorry for the delay, this application is running on a free tier :)
          <p className="text-gray-300 ml-2 mr-2 font-bold text-l"> {count}</p>
          connecting to server......
        </div>
      )}
    </>
  );
};

export default Login;
