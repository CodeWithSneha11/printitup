import React, { useState } from "react";
import {
  FaStore,
  FaBell,
  FaSave,
  FaShoppingCart,
  FaGlobe,
  FaCog,
} from "react-icons/fa";

import "../styles/AdminSettings.css";

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    storeName: "PrintItUp",

    currency: "INR",

    orderNotifications: true,

    newOrderAlert: true,

    autoAcceptOrders: false,

    websiteStatus: "Active",

    maintenanceMode: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setSettings({
      ...settings,

      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSave = () => {
    console.log("Saved Settings:", settings);

    alert("Settings saved successfully!");
  };

  return (
    <div className="admin-settings">
      <div className="settings-header">
        <h1>Admin Settings</h1>

        <p>Manage general settings for your PrintItUp store</p>
      </div>

      {/* Store Configuration */}

      <div className="settings-card">
        <div className="card-title">
          <FaStore />

          <h2>Store Configuration</h2>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Store Name</label>

            <input
              type="text"
              name="storeName"
              value={settings.storeName}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Currency</label>

            <select
              name="currency"
              value={settings.currency}
              onChange={handleChange}
            >
              <option value="INR">Indian Rupee (₹)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Order Settings */}

      <div className="settings-card">
        <div className="card-title">
          <FaShoppingCart />

          <h2>Order Settings</h2>
        </div>

        <label className="switch-container">
          <input
            type="checkbox"
            name="autoAcceptOrders"
            checked={settings.autoAcceptOrders}
            onChange={handleChange}
          />

          <span className="slider"></span>

          <p>Automatically accept new orders</p>
        </label>
      </div>

      {/* Notification Settings */}

      <div className="settings-card">
        <div className="card-title">
          <FaBell />

          <h2>Notifications</h2>
        </div>

        <label className="switch-container">
          <input
            type="checkbox"
            name="orderNotifications"
            checked={settings.orderNotifications}
            onChange={handleChange}
          />

          <span className="slider"></span>

          <p>Enable order notifications</p>
        </label>

        <label className="switch-container">
          <input
            type="checkbox"
            name="newOrderAlert"
            checked={settings.newOrderAlert}
            onChange={handleChange}
          />

          <span className="slider"></span>

          <p>Show new order alerts</p>
        </label>
      </div>

      {/* Website Settings */}

      <div className="settings-card">
        <div className="card-title">
          <FaGlobe />

          <h2>Website Settings</h2>
        </div>

        <div className="form-group">
          <label>Website Status</label>

          <select
            name="websiteStatus"
            value={settings.websiteStatus}
            onChange={handleChange}
          >
            <option>Active</option>

            <option>Offline</option>
          </select>
        </div>

        <label className="switch-container">
          <input
            type="checkbox"
            name="maintenanceMode"
            checked={settings.maintenanceMode}
            onChange={handleChange}
          />

          <span className="slider"></span>

          <p>Enable maintenance mode</p>
        </label>
      </div>

      {/* Save */}

      <button className="save-settings" onClick={handleSave}>
        <FaSave />
        Save Settings
      </button>
    </div>
  );
};

export default AdminSettings;
