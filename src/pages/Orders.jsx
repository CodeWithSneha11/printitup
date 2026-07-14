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
import "../styles/Orders.css";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "orders"), (snapshot) => {
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
    });

    return () => unsubscribe();
  }, []);

  const updateStatus = async (order, newStatus) => {
    try {
      // Update order status

      await updateDoc(doc(db, "orders", order.id), {
        status: newStatus,
      });

      // Send notification to customer

      if (newStatus === "Processing") {
        await addDoc(collection(db, "notifications"), {
          userId: order.uid,

          title: "Order Confirmed",

          message: `Your order #${order.orderId} has been confirmed by PrintItUp.`,

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

                <option value="Pending">Pending</option>

                <option value="Processing">Processing</option>

                <option value="Shipped">Shipped</option>

                <option value="Delivered">Delivered</option>
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

                      <td>{order.customer?.phone}</td>

                      <td>₹{order.total}</td>

                      <td>
                        <select
                          className="status-select"
                          value={order.status}
                          onChange={(e) => updateStatus(order, e.target.value)}
                        >
                          <option value="Pending">Pending</option>

                          <option value="Processing">Processing</option>

                          <option value="Shipped">Shipped</option>

                          <option value="Delivered">Delivered</option>
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
                    <h2>Order Details</h2>

                    <button
                      className="close-btn"
                      onClick={() => setSelectedOrder(null)}
                    >
                      ✕
                    </button>
                  </div>

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

                        <div className="item-price">₹{item.price}</div>
                      </div>
                    ))}
                  </div>

                  <div className="modal-total">
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
