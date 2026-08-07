import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  FaClipboardList,
  FaCheckCircle,
  FaPrint,
  FaBoxOpen,
  FaTruck,
  FaHome,
} from "react-icons/fa";
import "../styles/Orders.css";

// Ordered production pipeline for a custom-print T-shirt order.
// Cancelled is intentionally NOT part of this list — it's a side
// exit, not a forward stage — and is appended separately wherever
// a full option list (dropdowns) is needed.
const ORDER_STATUSES = [
  { key: "Pending", label: "Pending", icon: <FaClipboardList /> },
  { key: "Confirmed", label: "Confirmed", icon: <FaCheckCircle /> },
  { key: "Printing", label: "Printing", icon: <FaPrint /> },
  { key: "Shipped", label: "Shipped", icon: <FaBoxOpen /> },
  { key: "Out for Delivery", label: "Out for Delivery", icon: <FaTruck /> },
  { key: "Delivered", label: "Delivered", icon: <FaHome /> },
];

// Notification copy for each status. Add/edit statuses here if you
// introduce new ones.
const STATUS_NOTIFICATIONS = {
  Confirmed: {
    title: "Order Confirmed",
    message: (id) => `Your order #${id} has been confirmed by PrintItUp.`,
  },

  Printing: {
    title: "Printing Started",
    message: (id) =>
      `Great news! Your custom design for order #${id} is now on the press.`,
  },
  Shipped: {
    title: "Order Shipped",
    message: (id) =>
      `Your order #${id} has been shipped and is on its way.`,
  },

  "Out for Delivery": {
    title: "Out for Delivery",
    message: (id) => `Your order #${id} is out for delivery. Almost there!`,
  },

  Delivered: {
    title: "Order Delivered",
    message: (id) => `Your order #${id} has been delivered. Enjoy!`,
  },

  Cancelled: {
    title: "Order Cancelled",
    message: (id) =>
      `Your order #${id} has been cancelled.`,
  },
};

// Once an order reaches one of these, the admin status control locks —
// there's nothing further to progress or correct from the dropdown.
const FINAL_STATUSES = ["Delivered", "Cancelled"];

const getStatusIndex = (status) =>
  ORDER_STATUSES.findIndex((s) => s.key === status);

// Compact production-stage tracker shown inside the order modal so
// admins get the same at-a-glance progress view customers see.
const AdminProgress = ({ status }) => {
  if (status === "Cancelled") return null;

  const currentIndex = getStatusIndex(status);

  return (
    <div className="admin-progress">
      {ORDER_STATUSES.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div className="admin-progress-step" key={step.key}>
            <div className="admin-progress-step-top">
              <div
                className={`admin-progress-icon ${isDone ? "done" : ""} ${
                  isCurrent ? "current" : ""
                }`}
              >
                {step.icon}
              </div>

              {index < ORDER_STATUSES.length - 1 && (
                <div
                  className={`admin-progress-connector ${
                    isDone ? "done" : ""
                  }`}
                />
              )}
            </div>

            <span
              className={`admin-progress-label ${
                isDone || isCurrent ? "active" : ""
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "orders"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        data.sort((a, b) => {
          const first = a.createdAt?.seconds || 0;
          const second = b.createdAt?.seconds || 0;

          return second - first;
        });

        setOrders(data);
        setLoading(false);
      },
      (error) => {
        console.error("Orders listener error:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const updateStatus = async (order, newStatus) => {
    // No real change (e.g. re-selecting the current status) -> do nothing,
    // don't write to Firestore, don't notify the customer.
    if (order.status === newStatus) return;

    try {
      // Update order status

      const updateData = {
        status: newStatus,
      };

      if (newStatus === "Cancelled") {
        updateData.cancelledAt = serverTimestamp();
        updateData.cancelledBy = "admin";
        updateData.cancellationReason = "Cancelled by admin";
      }

      await updateDoc(doc(db, "orders", order.id), updateData);

      // Send notification to customer for any status that has copy defined

      const config = STATUS_NOTIFICATIONS[newStatus];

      if (config && order.uid) {
        await addDoc(collection(db, "notifications"), {
          userId: order.uid,

          title: config.title,

          message: config.message(order.orderId || order.id),

          type: "order",

          read: false,

          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.log(error);

      alert("Unable to update status.");
    }
  };

  const deleteOrder = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this order?",
    );

    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "orders", id));

      alert("Order deleted successfully.");
    } catch (error) {
      console.log(error);

      alert("Failed to delete order.");
    }
  };

  // Search + Status Filter
  const filteredOrders = orders.filter((order) => {
    const customerName = order.customer?.name?.toLowerCase() || "";

    const customerPhone = order.customer?.phone || "";

    const matchesSearch =
      customerName.includes(search.toLowerCase()) ||
      customerPhone.includes(search);

    const matchesStatus =
      statusFilter === "All" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="admin-content">
        <h2>Loading Orders...</h2>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-content">
        <div className="orders-page">
          <div className="orders-header">
            <div>
              <h1>Orders</h1>

              <p>Total Orders : {filteredOrders.length}</p>
            </div>

            <div className="orders-filters">
              <input
                type="text"
                placeholder="Search by name or phone..."
                className="search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Orders</option>

                {ORDER_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}

                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="orders-card">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Customer</th>

                  <th>Phone</th>

                  <th>Total</th>

                  <th>Status</th>

                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        textAlign: "center",
                        padding: "30px",
                      }}
                    >
                      No Orders Found
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.customer?.name}</td>

                      <td>
                        <span className="mono">{order.customer?.phone}</span>
                      </td>

                      <td>
                        <span className="mono">₹{order.total}</span>
                      </td>

                      <td>
                        <select
                          className="status-select"
                          data-status={order.status}
                          value={order.status}
                          disabled={FINAL_STATUSES.includes(order.status)}
                          onChange={(e) => updateStatus(order, e.target.value)}
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s.key} value={s.key}>
                              {s.label}
                            </option>
                          ))}

                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            className="view-btn"
                            onClick={() => setSelectedOrder(order)}
                          >
                            View
                          </button>

                          <button
                            className="delete-btn"
                            onClick={() => deleteOrder(order.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {selectedOrder && (
              <div
                className="modal-overlay"
                onClick={() => setSelectedOrder(null)}
              >
                <div
                  className="order-modal"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="modal-header">
                    <div>
                      <h2>Order Details</h2>
                      <p className="modal-order-id mono">#{selectedOrder.id}</p>
                    </div>

                    <button
                      className="close-btn"
                      onClick={() => setSelectedOrder(null)}
                    >
                      ✕
                    </button>
                  </div>

                  <AdminProgress status={selectedOrder.status} />

                  <div className="customer-section">
                    <h3>Customer Information</h3>

                    <p>
                      <strong>Name :</strong> {selectedOrder.customer?.name}
                    </p>

                    <p>
                      <strong>Phone :</strong> {selectedOrder.customer?.phone}
                    </p>

                    <p>
                      <strong>Email :</strong> {selectedOrder.customer?.email}
                    </p>

                    {/*
                      Address fields live under `deliveryAddress`
                      (set in Checkout.jsx as `deliveryAddress: selectedAddress`),
                      NOT under `customer`. Reading them from `customer`
                      was the bug causing blank address fields.
                    */}

                    <p>
                      <strong>House :</strong>{" "}
                      {selectedOrder.deliveryAddress?.house}
                    </p>

                    <p>
                      <strong>Area :</strong>{" "}
                      {selectedOrder.deliveryAddress?.area}
                    </p>

                    <p>
                      <strong>City :</strong>{" "}
                      {selectedOrder.deliveryAddress?.city}
                    </p>

                    <p>
                      <strong>State :</strong>{" "}
                      {selectedOrder.deliveryAddress?.state}
                    </p>

                    <p>
                      <strong>Pincode :</strong>{" "}
                      {selectedOrder.deliveryAddress?.pincode}
                    </p>

                    {selectedOrder.deliveryAddress?.landmark && (
                      <p>
                        <strong>Landmark :</strong>{" "}
                        {selectedOrder.deliveryAddress.landmark}
                      </p>
                    )}

                    {/*
                      Payment method is saved as a top-level `payment`
                      field in Checkout.jsx, not under `customer`.
                    */}

                    <p>
                      <strong>Payment :</strong> {selectedOrder.payment}
                    </p>

                    <p>
                      <strong>Status :</strong> {selectedOrder.status}
                    </p>
                    {selectedOrder.status === "Cancelled" && (
                      <div className="cancellation-details">
                        <h3>Cancellation Details</h3>

                        <p>
                          <strong>Reason :</strong>{" "}
                          {selectedOrder.cancellationReason ||
                            "No reason provided"}
                        </p>

                        <p>
                          <strong>Cancelled On :</strong>{" "}
                          {selectedOrder.cancelledAt?.toDate
                            ? selectedOrder.cancelledAt
                                .toDate()
                                .toLocaleString()
                            : "-"}
                        </p>
                      </div>
                    )}
                  </div>

                  <hr />

                  <h3 className="items-title">Ordered Products</h3>

                  <div className="items-list">
                    {selectedOrder.items?.map((item, index) => (
                      <div className="item-card" key={index}>
                        <div className="item-image">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="Design" />
                          ) : (
                            <div className="no-image">No Image</div>
                          )}
                        </div>

                        <div className="item-details">
                          <h4>{item.text || "Custom T-Shirt"}</h4>

                          <p>
                            <strong>Color:</strong> {item.tshirtColor}
                          </p>

                          <p>
                            <strong>Size:</strong> {item.size}
                          </p>

                          <p>
                            <strong>Neck:</strong> {item.neck}
                          </p>

                          <p>
                            <strong>Side:</strong> {item.side}
                          </p>

                          <p>
                            <strong>Position:</strong> {item.position}
                          </p>

                          <p>
                            <strong>Quantity:</strong> {item.quantity || 1}
                          </p>
                        </div>

                        <div className="item-price mono">₹{item.price}</div>
                      </div>
                    ))}
                  </div>

                  <div className="modal-total mono">
                    Grand Total : ₹{selectedOrder.total}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;