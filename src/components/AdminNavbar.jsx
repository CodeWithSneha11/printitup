import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import {
  FaBell,
  FaSearch,
  FaUserCircle,
  FaCog,
  FaSignOutAlt,
} from "react-icons/fa";

import { auth } from "../firebase";

import "../styles/AdminNavbar.css";

const AdminNavbar = () => {
  const navigate = useNavigate();

  const profileRef = useRef(null);

  const [showMenu, setShowMenu] = useState(false);

  const [adminName] = useState(
    localStorage.getItem("adminName") || "Admin"
  );

  const [adminEmail] = useState(
    localStorage.getItem("adminEmail") || ""
  );

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setShowMenu(false);
      }
    };

  document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);

      localStorage.removeItem("adminUid");
      localStorage.removeItem("adminEmail");
      localStorage.removeItem("adminName");

      localStorage.removeItem("uid");
      localStorage.removeItem("email");

      navigate("/admin-login");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="admin-navbar">

      <div className="navbar-left">
        <h2>Dashboard</h2>

        <p>{today}</p>
      </div>

      <div className="navbar-center">

        <div className="search-box">
          <FaSearch />

          <input
            type="text"
            placeholder="Search..."
          />
        </div>

      </div>

      <div className="navbar-right">

        <button className="notification-btn">
          <FaBell />

          <span className="notification-dot"></span>
        </button>

        <div
          className="admin-profile"
          ref={profileRef}
        >

          <div
            className="admin-avatar"
            onClick={() =>
              setShowMenu(!showMenu)
            }
          >
            {adminName.charAt(0).toUpperCase()}
          </div>

          {showMenu && (

            <div className="admin-dropdown">

              <div className="admin-dropdown-header">

                <div className="admin-avatar-large">
                  {adminName.charAt(0).toUpperCase()}
                </div>

                <h4>{adminName}</h4>

                <p>{adminEmail}</p>

              </div>

             <button
  onClick={() => {
    navigate("/admin-dashboard/profile");
    setShowMenu(false);
  }}
>
  <FaUserCircle />
  Profile
</button>

              <button>
                <FaCog />
                Settings
              </button>

              <button
                onClick={handleLogout}
              >
                <FaSignOutAlt />
                Logout
              </button>

            </div>

          )}

        </div>

      </div>

    </div>
  );
};

export default AdminNavbar;