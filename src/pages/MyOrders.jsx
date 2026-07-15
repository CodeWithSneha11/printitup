import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import {
  FaUser,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCreditCard,
  FaShoppingBag,
  FaCalendarAlt,
  FaTimes,
  FaClipboardCheck,
  FaBoxOpen,
  FaTruck,
  FaHome,
  FaCheck,
  FaBan,
} from "react-icons/fa";

import "../styles/MyOrders.css";

// ---- Order tracking config ----
// Edit these labels/order to match the exact status strings you save in Firestore.
const STATUS_FLOW = [
  { key: "Pending", label: "Order Placed", icon: <FaClipboardCheck /> },
  { key: "Confirmed", label: "Confirmed", icon: <FaCheck /> },
  { key: "Shipped", label: "Shipped", icon: <FaBoxOpen /> },
  { key: "Out for Delivery", label: "Out for Delivery", icon: <FaTruck /> },
  { key: "Delivered", label: "Delivered", icon: <FaHome /> },
];

// Old orders saved before the "Processing" -> "Confirmed" rename still have
// status: "Processing" in Firestore. Map that legacy value onto the
// "Confirmed" step so existing orders keep tracking correctly.
const LEGACY_STATUS_MAP = {
  Processing: "Confirmed",
};

const getStepIndex = (status) => {
  if (!status) return 0;
  if (status === "Cancelled") return -1;

  const normalized = LEGACY_STATUS_MAP[status] || status;

  const idx = STATUS_FLOW.findIndex(
    (s) => s.key.toLowerCase() === normalized.toLowerCase()
  );
  return idx === -1 ? 0 : idx;
};


// Full step tracker shown inside the order details modal
const OrderTracker = ({ status }) => {
  const currentIndex = getStepIndex(status);

  if (currentIndex === -1) {
    return (
      <div className="order-tracker cancelled-tracker">
        <FaBan size={22} />
        <p>This order was cancelled.</p>
      </div>
    );
  }

  return (
    <div className="order-tracker">
      {STATUS_FLOW.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div className="tracker-step" key={step.key}>
            <div className="tracker-step-top">
              <div
                className={`tracker-icon ${isDone ? "done" : ""} ${
                  isCurrent ? "current" : ""
                }`}
              >
                {step.icon}
              </div>

              {index < STATUS_FLOW.length - 1 && (
                <div
                  className={`tracker-connector ${isDone ? "done" : ""}`}
                />
              )}
            </div>

            <span
              className={`tracker-label ${
                isDone || isCurrent ? "active-label" : ""
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

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, "orders"), where("uid", "==", user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
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

  if (loading) {
    return <div className="myorders-loading">Loading Orders...</div>;
  }

  return (
    <div className="myorders-page">
      <div className="myorders-header">
        <div>
          <h1>My Orders</h1>
          <p>Track all your custom T-shirt orders</p>
        </div>

        <div className="orders-count">{orders.length} Orders</div>
      </div>

      {orders.length === 0 ? (
        <div className="empty-orders">
          <FaShoppingBag size={60} />

          <h2>No Orders Yet</h2>

          <p>Your placed orders will appear here.</p>
        </div>
      ) : (
        <div className="orders-grid">
          {orders.map((order) => (
            <div className="order-card" key={order.id}>
              <div className="order-top">
                <div>
                  <h3>Order #{order.id.slice(0, 8)}</h3>

                  <p>
                    <FaCalendarAlt />

                    {order.createdAt?.toDate().toLocaleDateString()}
                  </p>
                </div>

                <span className={`status ${order.status?.toLowerCase()}`}>
                  {order.status}
                </span>
              </div>

              <div className="order-middle">
                <div className="order-info">
                  <span>Products</span>

                  <strong>{order.items?.length}</strong>
                </div>

                <div className="order-info">
                  <span>Payment</span>

                  <strong>{order.payment}</strong>
                </div>

                <div className="order-info">
                  <span>Total</span>

                  <strong className="price">₹{order.total}</strong>
                </div>
              </div>

              <button
                className="details-btn"
                onClick={() => setSelectedOrder(order)}
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedOrder && (
        <div className="modal-overlay">
          <div className="order-modal">
            <div className="modal-header">
              <div>
                <h2>Order #{selectedOrder.id.slice(0, 8)}</h2>

                <p>
                  Ordered on{" "}
                  {selectedOrder.createdAt?.toDate().toLocaleString()}
                </p>
              </div>

              <div className="header-right">
                <span
                  className={`status ${selectedOrder.status?.toLowerCase()}`}
                >
                  {selectedOrder.status}
                </span>

                <button
                  className="close-btn"
                  onClick={() => setSelectedOrder(null)}
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="modal-content">
              <OrderTracker status={selectedOrder.status} />

              <div className="info-grid">
                <div className="info-card">
                  <p>
                    <FaUser />

                    {selectedOrder.customer?.name}
                  </p>

                  <p>
                    <FaEnvelope />

                    {selectedOrder.customer?.email || "-"}
                  </p>

                  <p>
                    <FaPhone />

                    {selectedOrder.customer?.phone}
                  </p>
                </div>

                <div className="info-card">
                  <h3>
                    <FaMapMarkerAlt />
                    Delivery Address
                  </h3>

                  <p>
                    <strong>{selectedOrder.deliveryAddress?.fullName}</strong>
                  </p>

                  <p>{selectedOrder.deliveryAddress?.phone}</p>

                  <p>
                    {selectedOrder.deliveryAddress?.house},{" "}
                    {selectedOrder.deliveryAddress?.area}
                  </p>

                  {selectedOrder.deliveryAddress?.landmark && (
                    <p>
                      Landmark : {selectedOrder.deliveryAddress.landmark}
                    </p>
                  )}

                  <p>
                    {selectedOrder.deliveryAddress?.city},{" "}
                    {selectedOrder.deliveryAddress?.state}
                  </p>

                  <p>{selectedOrder.deliveryAddress?.pincode}</p>
                </div>

                <div className="info-card">
                  <h3>
                    <FaCreditCard />
                    Payment
                  </h3>

                  <p>{selectedOrder.payment}</p>
                  <p>
                    {selectedOrder.status === "Delivered"
                      ? "Payment Successful"
                      : "Pay on Delivery"}
                  </p>
                </div>
              </div>

              <h3 className="items-title">Ordered Products</h3>

              <div className="items-list">
                {selectedOrder.items?.map((item, index) => (
                  <div className="product-card" key={index}>
                    <div className="product-image">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="Custom T-Shirt" />
                      ) : (
                        <div className="no-image">No Preview</div>
                      )}
                    </div>

                    <div className="product-info">
                      <h4>Custom T-Shirt</h4>

                      <div className="product-specs">
                        <div>
                          <span>Text</span>
                          <strong>{item.text || "-"}</strong>
                        </div>

                        <div>
                          <span>Size</span>
                          <strong>{item.size}</strong>
                        </div>

                        <div>
                          <span>Color</span>
                          <strong>{item.tshirtColor}</strong>
                        </div>

                        <div>
                          <span>Neck</span>
                          <strong>{item.neck}</strong>
                        </div>

                        <div>
                          <span>Print Side</span>
                          <strong>{item.side}</strong>
                        </div>

                        <div>
                          <span>Position</span>
                          <strong>{item.position}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="product-price">₹{item.price}</div>
                  </div>
                ))}
              </div>

              <div className="summary-card">
                <div className="summary-row">
                  <span>Subtotal</span>

                  <strong>₹{selectedOrder.total}</strong>
                </div>

                <div className="summary-row">
                  <span>Delivery Charges</span>

                  <strong className="free">FREE</strong>
                </div>

                <div className="summary-row">
                  <span>GST</span>

                  <strong>Included</strong>
                </div>

                <hr />

                <div className="summary-row grand-total">
                  <span>Grand Total</span>

                  <strong>₹{selectedOrder.total}</strong>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="close-modal-btn"
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrders;