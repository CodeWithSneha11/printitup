import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { doc, getDoc } from "firebase/firestore";

import { db } from "../firebase";

import "../styles/RecentOrders.css";

const RecentOrders = ({ orders }) => {
  const navigate = useNavigate();

  const [customerNames, setCustomerNames] = useState({});

  useEffect(() => {
    const fetchCustomers = async () => {
      const names = {};

      for (const order of orders) {
        // 1. If customer data is already inside order

        if (order.customer?.name) {
          names[order.id] = order.customer.name;

          continue;
        }

        // 2. If userId exists fetch from users collection

        if (order.userId) {
          try {
            const userRef = doc(db, "users", order.userId);

            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
              const userData = userSnap.data();

              names[order.id] =
                userData.name ||
                userData.displayName ||
                userData.email ||
                "User";
            }
          } catch (error) {
            console.log("User fetch error:", error);
          }
        }

        // 3. Fallback

        if (!names[order.id]) {
          names[order.id] =
            order.userName || order.customerName || order.email || "Guest";
        }
      }

      setCustomerNames(names);
    };

    if (orders.length > 0) {
      fetchCustomers();
    }
  }, [orders]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "-";

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "status-pending";

      case "processing":
        return "status-processing";

      case "shipped":
        return "status-shipped";

      case "delivered":
        return "status-delivered";

      case "cancelled":
        return "status-cancelled";

      default:
        return "status-default";
    }
  };

  return (
    <div className="recent-orders-container">
      <div className="recent-orders-header">
        <h2>Recent Orders</h2>

        <button
          className="view-orders-btn"
          onClick={() => navigate("/admin-dashboard/orders")}
        >
          View All Orders
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="no-orders">No recent orders found</div>
      ) : (
        <div className="table-wrapper">
          <table className="recent-orders-table">
            <thead>
              <tr>
                <th>Order ID</th>

                <th>Customer</th>

                <th>Amount</th>

                <th>Status</th>

                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id.slice(0, 8)}</td>

                  <td>{customerNames[order.id] || "Loading..."}</td>

                  <td>₹{Number(order.total || 0).toLocaleString("en-IN")}</td>

                  <td>
                    <span
                      className={`order-status ${getStatusClass(order.status)}`}
                    >
                      {order.status || "Pending"}
                    </span>
                  </td>

                  <td>{formatDate(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RecentOrders;
