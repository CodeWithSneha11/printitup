import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  FaHome,
  FaBoxOpen,
  FaShoppingCart,
  FaUsers,
  FaChartBar,
  FaCog,
  FaBars,
  FaTimes,
} from "react-icons/fa";

import "../styles/Sidebar.css";

const Sidebar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // close drawer whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const navItems = [
    { to: "/admin-dashboard", end: true, icon: <FaHome />, label: "Dashboard" },
    { to: "/admin-dashboard/orders", icon: <FaShoppingCart />, label: "Orders" },
    { to: "/admin-dashboard/collections", icon: <FaBoxOpen />, label: "Collections" },
    { to: "/admin-dashboard/users", icon: <FaUsers />, label: "Users" },
    { to: "/admin-dashboard/analytics", icon: <FaChartBar />, label: "Analytics" },
    { to: "/admin-dashboard/settings", icon: <FaCog />, label: "Settings" },
  ];

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <FaTimes /> : <FaBars />}
      </button>

      <div
        className={`sidebar-overlay ${open ? "open" : ""}`}
        onClick={() => setOpen(false)}
      />

      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-top">
          <h2 className="sidebar-logo">PrintItUp</h2>

          <nav className="sidebar-menu">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive ? "sidebar-link active" : "sidebar-link"
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

      </aside>
    </>
  );
};

export default Sidebar;