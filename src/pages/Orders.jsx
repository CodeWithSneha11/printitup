import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

import { db } from "../firebase";

import "../styles/Orders.css";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

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
      }
    );

    return () => unsubscribe();
  }, []);

  const updateStatus = async (
    id,
    newStatus
  ) => {
    try {
      await updateDoc(
        doc(db, "orders", id),
        {
          status: newStatus,
        }
      );
    } catch (error) {
      console.log(error);

      alert("Unable to update status.");
    }
  };

  const deleteOrder = async (id) => {
    const confirmDelete = window.confirm(
      "Delete this order?"
    );

    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "orders", id));

      alert("Order deleted.");
    } catch (error) {
      console.log(error);

      alert("Unable to delete order.");
    }
  };

  const filteredOrders = orders.filter(
    (order) => {
      const customer =
        order.customer?.name?.toLowerCase() ||
        "";

      const phone =
        order.customer?.phone || "";

      const matchesSearch =
        customer.includes(
          search.toLowerCase()
        ) || phone.includes(search);

      const matchesStatus =
        statusFilter === "All" ||
        order.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    }
  );

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

              <p>
                Total Orders :
                {" "}
                {filteredOrders.length}
              </p>

            </div>

            <div className="orders-filters">

              <input
                className="search-input"
                type="text"
                placeholder="Search customer..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />

              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
                }
              >
                <option value="All">
                  All Orders
                </option>

                <option value="Pending">
                  Pending
                </option>

                <option value="Processing">
                  Processing
                </option>

                <option value="Shipped">
                  Shipped
                </option>

                <option value="Delivered">
                  Delivered
                </option>

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
                        padding: "40px",
                      }}
                    >
                      No Orders Found
                    </td>

                  </tr>

                ) : (

                  filteredOrders.map(
                    (order) => (

                      <tr key={order.id}>

                        <td>
                          {
                            order.customer
                              ?.name
                          }
                        </td>

                        <td>
                          {
                            order.customer
                              ?.phone
                          }
                        </td>

                        <td>
                          ₹{order.total}
                        </td>

                        <td>

                          <select
                            className="status-select"
                            value={
                              order.status
                            }
                            onChange={(
                              e
                            ) =>
                              updateStatus(
                                order.id,
                                e.target
                                  .value
                              )
                            }
                          >

                            <option>
                              Pending
                            </option>

                            <option>
                              Processing
                            </option>

                            <option>
                              Shipped
                            </option>

                            <option>
                              Delivered
                            </option>

                          </select>

                        </td>

                        <td>

                          <div className="action-buttons">

                            <button
                              className="view-btn"
                              onClick={() =>
                                setSelectedOrder(
                                  order
                                )
                              }
                            >
                              View Details
                            </button>

                            <button
                              className="delete-btn"
                              onClick={() =>
                                deleteOrder(
                                  order.id
                                )
                              }
                            >
                              Delete
                            </button>

                          </div>

                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

            {selectedOrder && (

              <div
                className="modal-overlay"
                onClick={() =>
                  setSelectedOrder(null)
                }
              >

                <div
                  className="order-modal"
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                >
                                    <div className="modal-header">

                    <div>

                      <h2>
                        Order #{selectedOrder.id.slice(0, 8)}
                      </h2>

                      <p className="modal-date">
                        {selectedOrder.createdAt
                          ?.toDate()
                          .toLocaleString()}
                      </p>

                    </div>

                    <button
                      className="close-btn"
                      onClick={() =>
                        setSelectedOrder(null)
                      }
                    >
                      ✕
                    </button>

                  </div>

                  <div className="details-grid">

                    {/* CUSTOMER */}

                    <div className="details-card">

                      <h3>
                        👤 Customer Information
                      </h3>

                      <div className="detail-row">

                        <span>Name</span>

                        <strong>
                          {selectedOrder.customer?.name}
                        </strong>

                      </div>

                      <div className="detail-row">

                        <span>Email</span>

                        <strong>
                          {selectedOrder.customer?.email ||
                            "-"}
                        </strong>

                      </div>

                      <div className="detail-row">

                        <span>Phone</span>

                        <strong>
                          {selectedOrder.customer?.phone}
                        </strong>

                      </div>

                    </div>

                    {/* SHIPPING */}

                    <div className="details-card">

                      <h3>
                        📍 Shipping Address
                      </h3>

                      <p className="address-box">

                        {selectedOrder.customer?.address}

                        <br />

                        {selectedOrder.customer?.city}

                        ,{" "}

                        {selectedOrder.customer?.state}

                        <br />

                        {selectedOrder.customer?.pincode}

                      </p>

                    </div>

                    {/* ORDER */}

                    <div className="details-card">

                      <h3>
                        📦 Order Information
                      </h3>

                      <div className="detail-row">

                        <span>Status</span>

                        <span
                          className={`status ${selectedOrder.status?.toLowerCase()}`}
                        >
                          {selectedOrder.status}
                        </span>

                      </div>

                      <div className="detail-row">

                        <span>Payment</span>

                        <strong>
                          {selectedOrder.customer?.payment}
                        </strong>

                      </div>

                      <div className="detail-row">

                        <span>Products</span>

                        <strong>
                          {selectedOrder.items?.length}
                        </strong>

                      </div>

                    </div>

                    {/* TOTAL */}

                    <div className="details-card total-card">

                      <h3>Total Amount</h3>

                      <h1>
                        ₹{selectedOrder.total}
                      </h1>

                    </div>

                  </div>

                  <h3 className="items-title">

                    Ordered Products

                  </h3>

                  <div className="items-list">

                    {selectedOrder.items?.map(
                      (item, index) => (

                        <div
                          key={index}
                          className="item-card"
                        >

                          <div className="item-image">

                            {item.imageUrl ? (

                              <img
                                src={item.imageUrl}
                                alt=""
                              />

                            ) : (

                              <div className="no-image">

                                No Image

                              </div>

                            )}

                          </div>

                          <div className="item-details">

                            <h4>
                              Custom T-Shirt
                            </h4>

                            <div className="item-grid">

                              <p>

                                <strong>Text</strong>

                                <br />

                                {item.text || "-"}

                              </p>

                              <p>

                                <strong>Size</strong>

                                <br />

                                {item.size}

                              </p>

                              <p>

                                <strong>Color</strong>

                                <br />

                                {item.tshirtColor}

                              </p>

                              <p>

                                <strong>Neck</strong>

                                <br />

                                {item.neck}

                              </p>

                              <p>

                                <strong>Print Side</strong>

                                <br />

                                {item.side}

                              </p>

                              <p>

                                <strong>Position</strong>

                                <br />

                                {item.position}

                              </p>

                            </div>

                          </div>

                          <div className="item-price">

                            ₹{item.price}

                          </div>

                        </div>

                      )
                    )}

                  </div>

                  <div className="modal-total">

                    Grand Total

                    <span>

                      ₹{selectedOrder.total}

                    </span>

                  </div>                </div>

              </div>

            )}

          </div>

        </div>

      </div>

    </div>
  );
};

export default Orders;