import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";

import Sidebar from "../components/Sidebar";
import DashboardCards from "../components/DashboardCards";

import "../styles/AdminDashboard.css";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("dashboard");

  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const adminUid = localStorage.getItem("adminUid");

    if (!adminUid) {
      navigate("/admin-login");
      return;
    }

    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      // Orders
      const orderSnapshot = await getDocs(collection(db, "orders"));

      const orderList = orderSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setOrders(orderList);

      // Users
      const userSnapshot = await getDocs(collection(db, "users"));

      const userList = userSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setUsers(userList);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  // Total Revenue
  const totalRevenue = orders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0,
  );

  // Pending Orders
  const pendingOrders = orders.filter(
    (order) => order.status === "Pending",
  ).length;

  if (loading) {
    return (
      <div className="admin-page">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="admin-content">
          <h2>Loading Dashboard...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="admin-content">
        <h1 className="admin-title">Admin Dashboard</h1>

        <DashboardCards
          orders={orders.length}
          revenue={totalRevenue}
          users={users.length}
          pending={pendingOrders}
        />

        {/* Orders table will come next */}
      </div>
    </div>
  );
};

export default AdminDashboard;
