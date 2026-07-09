import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserCircle,
  FaEnvelope,
  FaUserShield,
  FaArrowLeft,
} from "react-icons/fa";

import "../styles/AdminProfile.css";

const AdminProfile = () => {
  const navigate = useNavigate();

  const adminName =
    localStorage.getItem("adminName") || "Admin";

  const adminEmail =
    localStorage.getItem("adminEmail") || "";

  return (
    <div className="admin-content">

      <div className="admin-profile-header">

        <button
          className="back-btn"
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft />
          Back
        </button>

        <h1>Admin Profile</h1>

      </div>

      <div className="admin-profile-card">

        <div className="admin-profile-top">

          <div className="profile-circle">

            {adminName.charAt(0).toUpperCase()}

          </div>

          <h2>{adminName}</h2>

          <p>Administrator</p>

        </div>

        <div className="admin-info">

          <div className="info-row">

            <FaUserCircle />

            <div>

              <span>Name</span>

              <h4>{adminName}</h4>

            </div>

          </div>

          <div className="info-row">

            <FaEnvelope />

            <div>

              <span>Email</span>

              <h4>{adminEmail}</h4>

            </div>

          </div>

          <div className="info-row">

            <FaUserShield />

            <div>

              <span>Role</span>

              <h4>Administrator</h4>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default AdminProfile;