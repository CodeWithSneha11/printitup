import React from "react";
import { FaBell, FaSearch, FaUserCircle } from "react-icons/fa";

import "../styles/AdminNavbar.css";

const AdminNavbar = () => {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="admin-navbar">
      <div className="navbar-left">
        <h2>Dashboard</h2>

        <p>{today}</p>
      </div>

      <div className="navbar-center">
        <div className="search-box">
          <FaSearch />

          <input type="text" placeholder="Search..." />
        </div>
      </div>

      <div className="navbar-right">
        <button className="notification-btn">
          <FaBell />

          <span className="notification-dot"></span>
        </button>

        <div className="admin-profile">
          <FaUserCircle className="profile-icon" />

          <div>
            <h4>Admin</h4>

            <p>PrintItUp</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNavbar;
