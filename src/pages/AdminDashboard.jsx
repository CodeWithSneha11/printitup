import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import { db } from "../firebase";

import DashboardCards from "../components/DashboardCards";
import TodaysSummary from "../components/TodaysSummary";
import RecentOrders from "../components/RecentOrders";

import "../styles/AdminDashboard.css";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);

  // Today's Summary States
  const [todayOrders, setTodayOrders] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [newUsersToday, setNewUsersToday] = useState(0);

  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState([]);

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

      // --------------------
      // Fetch Orders
      // --------------------

      const orderSnapshot = await getDocs(collection(db, "orders"));

      const orderList = orderSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setOrders(orderList);

      // --------------------
      // Latest 5 Orders
      // --------------------

      const latestOrders = [...orderList]
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate
            ? a.createdAt.toDate()
            : new Date(0);

          const dateB = b.createdAt?.toDate
            ? b.createdAt.toDate()
            : new Date(0);

          return dateB - dateA;
        })
        .slice(0, 5);

      setRecentOrders(latestOrders);

      // --------------------
      // Fetch Users
      // --------------------

      const userSnapshot = await getDocs(collection(db, "users"));

      const userList = userSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setUsers(userList);

          const today = new Date();
      today.setHours(0, 0, 0, 0);

      // -------------------------
      // Today's NON-CANCELLED Orders
      // -------------------------

      const todaysOrders = orderList.filter((order) => {
        if (!order.createdAt) return false;

        const orderDate = order.createdAt.toDate();
        orderDate.setHours(0, 0, 0, 0);

        return (
          orderDate.getTime() === today.getTime() &&
          order.status !== "Cancelled"
        );
      });

      setTodayOrders(todaysOrders.length);

      // -------------------------
      // Today's Revenue
      // (excluding cancelled orders)
      // -------------------------

      const revenue = todaysOrders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      );

      setTodayRevenue(revenue);

      // -------------------------
      // New Users Today
      // -------------------------

      const todaysUsers = userList.filter((user) => {
        if (!user.createdAt) return false;

        const userDate = user.createdAt.toDate();
        userDate.setHours(0, 0, 0, 0);

        return userDate.getTime() === today.getTime();
      });

      setNewUsersToday(todaysUsers.length);
    } catch (error) {
      console.log("Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------
  // Dashboard Statistics
  // -----------------------

  // Active Orders (excluding cancelled)
  const activeOrders = orders.filter(
    (order) => order.status !== "Cancelled"
  );

  // Total Revenue (excluding cancelled)
  const totalRevenue = activeOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  // Pending Orders
  const pendingOrders = orders.filter(
    (order) => order.status === "Pending"
  ).length;

  // Cancelled Orders
  const cancelledOrders = orders.filter(
    (order) => order.status === "Cancelled"
  ).length;


        return (
    <div className="admin-content">
      {loading ? (
        <h2>Loading Dashboard...</h2>
      ) : (
        <>
          <DashboardCards
            orders={activeOrders.length}
            revenue={totalRevenue}
            users={users.length}
            pending={pendingOrders}
            cancelled={cancelledOrders}
          />

          <TodaysSummary
            todayOrders={todayOrders}
            todayRevenue={todayRevenue}
            
            newUsers={newUsersToday}
          />

          <RecentOrders orders={recentOrders} />
        </>
      )}
    </div>
  );
};

export default AdminDashboard;