import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import "../styles/Users.css";

const STATUS_COLORS = {
  Pending: "#f59e0b",
  Confirmed: "#3b82f6",
  Processing: "#6366f1",
  Shipped: "#8b5cf6",
  "Out for Delivery": "#ec4899",
  Delivered: "#22c55e",
  Cancelled: "#ef4444",
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState(null);
  const [userOrders, setUserOrders] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  // -----------------------------
  // Fetch Users
  // -----------------------------
  const fetchUsers = async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(collection(db, "users"));

      const userList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      userList.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      setUsers(userList);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // Search
  // -----------------------------
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;

    return users.filter((user) => {
      const keyword = searchTerm.toLowerCase();

      return (
        user.name?.toLowerCase().includes(keyword) ||
        user.email?.toLowerCase().includes(keyword) ||
        user.uid?.toLowerCase().includes(keyword)
      );
    });
  }, [users, searchTerm]);

  // -----------------------------
  // Dashboard Statistics
  // -----------------------------
  const totalUsers = users.length;

  const usersToday = useMemo(() => {
    const today = new Date();

    return users.filter((user) => {
      if (!user.createdAt) return false;

      const d = new Date(user.createdAt.seconds * 1000);

      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    }).length;
  }, [users]);

  const thisMonthUsers = useMemo(() => {
    const today = new Date();

    return users.filter((user) => {
      if (!user.createdAt) return false;

      const d = new Date(user.createdAt.seconds * 1000);

      return (
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    }).length;
  }, [users]);

  // -----------------------------
  // Avatar Initials
  // -----------------------------
  const getInitials = (name) => {
    if (!name) return "?";

    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase();
  };

  // -----------------------------
  // Currency
  // -----------------------------
  const formatPrice = (value) => {
    return Number(value || 0).toLocaleString("en-IN");
  };

  // -----------------------------
  // Date
  // -----------------------------
  const formatDate = (timestamp) => {
    if (!timestamp) return "-";

    return new Date(timestamp.seconds * 1000).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "-";

    return new Date(timestamp.seconds * 1000).toLocaleString(
      "en-IN"
    );
  };

  // -----------------------------
  // Status Badge Color
  // -----------------------------
  const getStatusColor = (status) => {
    return STATUS_COLORS[status] || "#6b7280";
  };

  // -----------------------------
  // Open User
  // -----------------------------
  const openUserDetails = async (user) => {
    setSelectedUser(user);
    setLoadingOrders(true);

    try {
      const q = query(
        collection(db, "orders"),
        where("uid", "==", user.uid)
      );

      const snapshot = await getDocs(q);

      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      orders.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      setUserOrders(orders);
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingOrders(false);
    }
  };

  // -----------------------------
  // User Statistics
  // -----------------------------
  const totalSpent = userOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  const averageOrderValue =
    userOrders.length > 0
      ? Math.round(totalSpent / userOrders.length)
      : 0;

  const deliveredOrders = userOrders.filter(
    (o) => o.status === "Delivered"
  ).length;

  const pendingOrders = userOrders.filter(
    (o) =>
      o.status === "Pending" ||
      o.status === "Confirmed" ||
      o.status === "Processing"
  ).length;

  if (loading) {
    return (
      <div className="admin-content">
        <div className="users-loading">
          <div className="loader"></div>
          <h2>Loading Users...</h2>
        </div>
      </div>
    );
  }
    return (
    <div className="admin-content users-page">
      {/* ===========================
            Header
      ============================ */}
      <div className="users-topbar">
        <div>
          <h1 className="admin-title">Users</h1>
          <p className="users-subtitle">
            Manage your customers and view their activity.
          </p>
        </div>

        <div className="users-search">
          <input
            type="text"
            placeholder="Search by name, email or UID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ===========================
            Dashboard Cards
      ============================ */}

      <div className="users-stats-grid">
        <div className="users-stat-card">
          <div className="users-stat-title">
            Total Users
          </div>

          <div className="users-stat-value">
            {totalUsers}
          </div>

          <div className="users-stat-footer">
            Registered customers
          </div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-title">
            New Today
          </div>

          <div className="users-stat-value">
            {usersToday}
          </div>

          <div className="users-stat-footer">
            Joined today
          </div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-title">
            This Month
          </div>

          <div className="users-stat-value">
            {thisMonthUsers}
          </div>

          <div className="users-stat-footer">
            New registrations
          </div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-title">
            Search Results
          </div>

          <div className="users-stat-value">
            {filteredUsers.length}
          </div>

          <div className="users-stat-footer">
            Matching users
          </div>
        </div>
      </div>

      {/* ===========================
              Users Table
      ============================ */}

      <div className="users-card">

        <div className="users-card-header">

          <h2>Customer List</h2>

          <span>
            {filteredUsers.length} User
            {filteredUsers.length !== 1 ? "s" : ""}
          </span>

        </div>

        <div className="users-table-wrapper">

          <table className="users-table">

            <thead>

              <tr>

                <th>User</th>

                <th>Email</th>

                <th>Joined</th>

                <th align="center">
                  Action
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredUsers.length === 0 ? (

                <tr>

                  <td
                    colSpan="4"
                    className="no-users"
                  >
                    No Users Found
                  </td>

                </tr>

              ) : (

                filteredUsers.map((user) => (

                  <tr key={user.id}>

                    <td>

                      <div className="user-cell">

                        <div className="user-avatar">

                          {getInitials(user.name)}

                        </div>

                        <div>

                          <div className="user-name">

                            {user.name || "Unknown User"}

                          </div>

                          <div className="user-id">

                            {user.uid
                              ? user.uid.slice(0, 18) + "..."
                              : "-"}

                          </div>

                        </div>

                      </div>

                    </td>

                    <td>

                      <div className="user-email">

                        {user.email}

                      </div>

                    </td>

                    <td>

                      <div className="joined-date">

                        {formatDate(user.createdAt)}

                      </div>

                    </td>

                    <td align="center">

                      <button
                        className="view-btn"
                        onClick={() =>
                          openUserDetails(user)
                        }
                      >
                        View Details
                      </button>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>
            {/* ===========================
            USER DETAILS MODAL
      ============================ */}

      {selectedUser && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="user-modal premium-user-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}

            <div className="modal-header">
              <h2>Customer Details</h2>

              <button
                className="close-btn"
                onClick={() => setSelectedUser(null)}
              >
                ✕
              </button>
            </div>

            {/* Profile */}

            <div className="profile-header">

              <div className="profile-avatar">
                {getInitials(selectedUser.name)}
              </div>

              <div className="profile-content">

                <h2>
                  {selectedUser.name || "Unknown User"}
                </h2>

                <p className="profile-email">
                  {selectedUser.email}
                </p>

                <div className="profile-meta">

                  <span>
                    Joined {formatDate(selectedUser.createdAt)}
                  </span>

                  <span className="meta-dot">•</span>

                  <span>
                    UID:
                    {" "}
                    {selectedUser.uid
                      ? selectedUser.uid.slice(0, 18) + "..."
                      : "-"}
                  </span>

                </div>

              </div>

            </div>

            {/* Statistics */}

            <div className="profile-stats">

              <div className="profile-stat-card">

                <div className="stat-label">
                  Orders
                </div>

                <div className="stat-value">
                  {userOrders.length}
                </div>

              </div>

              <div className="profile-stat-card">

                <div className="stat-label">
                  Total Spent
                </div>

                <div className="stat-value">
                  ₹{formatPrice(totalSpent)}
                </div>

              </div>

              <div className="profile-stat-card">

                <div className="stat-label">
                  Average Order
                </div>

                <div className="stat-value">
                  ₹{formatPrice(averageOrderValue)}
                </div>

              </div>

              <div className="profile-stat-card">

                <div className="stat-label">
                  Delivered
                </div>

                <div className="stat-value">
                  {deliveredOrders}
                </div>

              </div>

            </div>

            {/* Information */}

            <div className="details-grid">

              <div className="detail-box">

                <span className="detail-title">
                  Full Name
                </span>

                <strong>
                  {selectedUser.name || "-"}
                </strong>

              </div>

              <div className="detail-box">

                <span className="detail-title">
                  Email Address
                </span>

                <strong>
                  {selectedUser.email}
                </strong>

              </div>

              <div className="detail-box">

                <span className="detail-title">
                  Joined On
                </span>

                <strong>
                  {formatDateTime(selectedUser.createdAt)}
                </strong>

              </div>

              <div className="detail-box">

                <span className="detail-title">
                  Pending Orders
                </span>

                <strong>
                  {pendingOrders}
                </strong>

              </div>

            </div>

            {/* Orders Heading */}

            <div className="orders-section-header">

              <div>

                <h3>
                  Customer Orders
                </h3>

                <p>
                  Complete purchase history
                </p>

              </div>

            </div>

           {loadingOrders ? (
  <div className="orders-loading">
    <div className="loader"></div>
    <p>Loading orders...</p>
  </div>
) : userOrders.length === 0 ? (
  <div className="empty-orders">
    <div className="empty-orders-icon">📦</div>

    <h3>No Orders Found</h3>

    <p>This customer hasn't placed any orders yet.</p>
  </div>
) : (
  <div className="orders-list">
    {userOrders.map((order) => (
      <div
        key={order.id}
        className="user-order-card"
      >
        <div className="order-left">
          <div className="order-top">
            <h4>
              Order #{order.id.slice(0, 8)}
            </h4>

            <span
              className="status-badge"
              style={{
                backgroundColor: getStatusColor(
                  order.status
                ),
              }}
            >
              {order.status}
            </span>
          </div>

          <div className="order-meta">
            <div>
              <span className="meta-label">
                Ordered
              </span>

              <strong>
                {formatDateTime(order.createdAt)}
              </strong>
            </div>

            <div>
              <span className="meta-label">
                Payment
              </span>

              <strong>
                {order.paymentMethod || "Online"}
              </strong>
            </div>

            <div>
              <span className="meta-label">
                Items
              </span>

              <strong>
                {order.items?.length || 0}
              </strong>
            </div>
          </div>
        </div>

        <div className="order-right">
          <div className="order-total-label">
            Total
          </div>

          <div className="order-total">
            ₹{formatPrice(order.total)}
          </div>

          {order.address?.city && (
            <div className="order-location">
              {order.address.city}
              {order.address.state
                ? `, ${order.address.state}`
                : ""}
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
)}

          </div>
        </div>
      )}

    </div>
  );
};

export default Users;

          