import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "../styles/AdminLayout.css";

const AdminLayout = () => {
  return (
    <div className="admin-layout">
      <Sidebar />

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;