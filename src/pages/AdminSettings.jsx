import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserCircle,
  FaEnvelope,
  FaUserShield,
  FaArrowLeft,
  FaPalette,
  FaCheckCircle,
  FaExclamationCircle,
  FaSave,
} from "react-icons/fa";

import "../styles/AdminSettings.css";

/* ---------- localStorage helpers ---------- */

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const DEFAULT_APPEARANCE = {
  theme: "dark", // "dark" | "light"
  compactMode: false,
};

/* ---------- component ---------- */

const TABS = [
  { id: "profile", label: "Profile", icon: <FaUserCircle /> },
  { id: "appearance", label: "Appearance", icon: <FaPalette /> },
];

const AdminSettings = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("profile");
  const [banner, setBanner] = useState(null); // { type: "success" | "error", text }

  /* profile state — email is read-only and cannot be changed */
  const [name, setName] = useState(localStorage.getItem("adminName") || "Admin");
  const email = localStorage.getItem("adminEmail") || "";
  const [profileErrors, setProfileErrors] = useState({});

  /* appearance state */
  const [appearance, setAppearance] = useState(
    readJSON("adminAppearance", DEFAULT_APPEARANCE)
  );

  /* apply theme to root on load + whenever it changes */
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-admin-theme",
      appearance.theme
    );
  }, [appearance.theme]);

  const showBanner = (type, text) => {
    setBanner({ type, text });
    window.clearTimeout(showBanner._t);
    showBanner._t = window.setTimeout(() => setBanner(null), 3000);
  };

  /* ---------- Profile handlers ---------- */

  const validateProfile = () => {
    const errors = {};
    if (!name.trim()) errors.name = "Name is required.";
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!validateProfile()) {
      showBanner("error", "Please fix the highlighted fields.");
      return;
    }
    localStorage.setItem("adminName", name.trim());
    showBanner("success", "Profile updated successfully.");
  };

  /* ---------- Appearance handlers ---------- */

 const handleThemeChange = (theme) => {
  const next = {
    ...appearance,
    theme,
  };

  setAppearance(next);

  localStorage.setItem(
    "adminAppearance",
    JSON.stringify(next)
  );

  // Apply immediately
  document.documentElement.setAttribute(
    "data-admin-theme",
    theme
  );

  showBanner("success", `Switched to ${theme} theme.`);
};

  const handleToggleCompact = () => {
    const next = { ...appearance, compactMode: !appearance.compactMode };
    setAppearance(next);
    localStorage.setItem("adminAppearance", JSON.stringify(next));
    showBanner("success", "Layout preference saved.");
  };

  return (
    <div className="admin-content">
      <div className="admin-profile-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft />
          Back
        </button>
        <h1>Admin Settings</h1>
      </div>

      {banner && (
        <div className={`admin-banner admin-banner-${banner.type}`}>
          {banner.type === "success" ? <FaCheckCircle /> : <FaExclamationCircle />}
          <span>{banner.text}</span>
        </div>
      )}

      <div className="admin-settings-layout">
        {/* Tabs */}
        <nav className="admin-settings-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`settings-tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Panels */}
        <div className="admin-settings-panel">
          {activeTab === "profile" && (
            <form className="settings-form" onSubmit={handleSaveProfile} noValidate>
              <div className="admin-profile-top">
                <div className="profile-circle">{name.charAt(0).toUpperCase() || "A"}</div>
                <h2>{name || "Admin"}</h2>
                <p>Administrator</p>
              </div>

              <div className="form-group">
                <label htmlFor="admin-name">
                  <FaUserCircle /> Full name
                </label>
                <input
                  id="admin-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                />
                {profileErrors.name && <span className="field-error">{profileErrors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="admin-email">
                  <FaEnvelope /> Email address
                </label>
                <input id="admin-email" type="email" value={email} disabled />
              </div>

              <div className="form-group">
                <label>
                  <FaUserShield /> Role
                </label>
                <input type="text" value="Administrator" disabled />
              </div>

              <button type="submit" className="save-btn">
                <FaSave /> Save changes
              </button>
            </form>
          )}

          {activeTab === "appearance" && (
            <div className="settings-form">
              <h3 className="settings-section-title">Theme</h3>
              <div className="theme-options">
                <button
                  type="button"
                  className={`theme-card ${appearance.theme === "dark" ? "active" : ""}`}
                  onClick={() => handleThemeChange("dark")}
                >
                  <span className="theme-swatch theme-swatch-dark" />
                  Dark
                </button>
                <button
                  type="button"
                  className={`theme-card ${appearance.theme === "light" ? "active" : ""}`}
                  onClick={() => handleThemeChange("light")}
                >
                  <span className="theme-swatch theme-swatch-light" />
                  Light
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;