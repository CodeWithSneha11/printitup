import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaBoxOpen,
  FaShoppingCart,
  FaUsers,
  FaChartBar,
  FaCog,
  FaSignOutAlt,
} from "react-icons/fa";

import { signOut } from "firebase/auth";
import { auth } from "../firebase";

import "../styles/Sidebar.css";

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);

      localStorage.removeItem("admin");

      navigate("/admin-login");
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <aside className="sidebar">

      <div className="sidebar-top">

        <h2 className="sidebar-logo">
          PrintItUp
        </h2>

      </div>

      <nav className="sidebar-menu">

        <NavLink
          to="/admin-dashboard"
          end
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <FaHome />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/admin-dashboard/orders"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <FaShoppingCart />
          <span>Orders</span>
        </NavLink>

        <NavLink
          to="/admin-dashboard/collections"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <FaBoxOpen />
          <span>Collections</span>
        </NavLink>
<NavLink
  to="/admin-dashboard/products/all"
  className={({ isActive }) =>
    isActive ? "sidebar-link active" : "sidebar-link"
  }
>
  <FaBoxOpen />
  <span>Products</span>
</NavLink>
        <NavLink
          to="/admin-dashboard/users"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <FaUsers />
          <span>Users</span>
        </NavLink>

        <NavLink
          to="/admin-dashboard/analytics"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <FaChartBar />
          <span>Analytics</span>
        </NavLink>

        <NavLink
          to="/admin-dashboard/settings"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <FaCog />
          <span>Settings</span>
        </NavLink>

      </nav>

      <button
        className="logout-sidebar"
        onClick={handleLogout}
      >
        <FaSignOutAlt />
        Logout
      </button>

    </aside>
  );
};

export default Sidebar;