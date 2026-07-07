import React from "react";
import { NavLink } from "react-router-dom";
import "../styles/Sidebar.css";

const Sidebar = () => {
  return (
    <div className="sidebar">

      <h1 className="sidebar-logo">
        PrintItUp
      </h1>

      <NavLink
        to="/admin-dashboard"
        end
        className={({ isActive }) =>
          isActive ? "sidebar-link active" : "sidebar-link"
        }
      >
         Dashboard
      </NavLink>

      <NavLink
        to="/admin-dashboard/orders"
        className={({ isActive }) =>
          isActive ? "sidebar-link active" : "sidebar-link"
        }
      >
         Orders
      </NavLink>

      <NavLink
        to="/admin-dashboard/products"
        className={({ isActive }) =>
          isActive ? "sidebar-link active" : "sidebar-link"
        }
      >
         Products
      </NavLink>

      <NavLink
        to="/admin-dashboard/users"
        className={({ isActive }) =>
          isActive ? "sidebar-link active" : "sidebar-link"
        }
      >
         Users
      </NavLink>

    </div>
  );
};

export default Sidebar;