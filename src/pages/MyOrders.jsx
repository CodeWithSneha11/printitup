import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
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
  FaStar,
  FaRegStar,
  FaPen,
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

const LEGACY_STATUS_MAP = {
  Processing: "Confirmed",
};

const getStepIndex = (status) => {
  if (!status) return 0;
  if (status === "Cancelled") return -1;

  const normalized = LEGACY_STATUS_MAP[status] || status;

  const idx = STATUS_FLOW.findIndex(
    (s) => s.key.toLowerCase() === normalized.toLowerCase(),
  );
  return idx === -1 ? 0 : idx;
};
const canCancelOrder = (status) => {
  if (!status) return false;

  const normalized = status.toLowerCase();

  return normalized === "pending" || normalized === "confirmed";
};

// Full step tracker shown inside the order details modal
const OrderTracker = ({ order }) => {
  const currentIndex = getStepIndex(order.status);

  if (currentIndex === -1) {
    return (
      <div className="order-tracker cancelled-tracker">
        <FaBan size={22} />

        <div className="cancelled-info">
          <h4>Order Cancelled</h4>

          {order.cancellationReason && (
            <p>Reason: {order.cancellationReason}</p>
          )}
          {order.cancelledAt && (
            <p>
              Cancelled On:{" "}
              {order.cancelledAt?.toDate
                ? order.cancelledAt.toDate().toLocaleString()
                : "-"}
            </p>
          )}
        </div>
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
                <div className={`tracker-connector ${isDone ? "done" : ""}`} />
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

// ---- Star rating ----
// readOnly renders a static display; otherwise clickable/hoverable input.
const StarRating = ({ value = 0, onChange, readOnly = false, size = 22 }) => {
  const [hovered, setHovered] = useState(0);
  const stars = [1, 2, 3, 4, 5];

  return (
    <div
      className={`star-rating${readOnly ? " star-rating-readonly" : ""}`}
      role={readOnly ? undefined : "radiogroup"}
      aria-label={readOnly ? undefined : "Rating"}
    >
      {stars.map((star) => {
        const filled = hovered ? star <= hovered : star <= value;

        return (
          <span
            key={star}
            className="star"
            style={{ fontSize: size }}
            onClick={() => !readOnly && onChange?.(star)}
            onMouseEnter={() => !readOnly && setHovered(star)}
            onMouseLeave={() => !readOnly && setHovered(0)}
            role={readOnly ? undefined : "radio"}
            aria-checked={readOnly ? undefined : star === value}
            tabIndex={readOnly ? -1 : 0}
            onKeyDown={(e) => {
              if (!readOnly && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onChange?.(star);
              }
            }}
          >
            {filled ? <FaStar /> : <FaRegStar />}
          </span>
        );
      })}
    </div>
  );
};

// ---- Review modal (write / edit) ----
const ReviewModal = ({
  order,
  item,
  itemIndex,
  existingReview,
  onClose,
  onSaved,
}) => {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const user = auth.currentUser;
      const reviewId = `${order.id}_${itemIndex}`;
      const reviewRef = doc(db, "reviews", reviewId);

      const payload = {
        orderId: order.id,
        itemIndex,
        uid: user?.uid || order.uid || null,
        customerName: order.customer?.name || "Anonymous",
        itemLabel: item.text || "Custom T-Shirt",
        imageUrl: item.imageUrl || null,
        rating,
        comment: comment.trim(),
        updatedAt: serverTimestamp(),
      };

      // Only stamp createdAt the first time this review is written so
      // edits don't reset its original submission date.
      if (!existingReview) {
        payload.createdAt = serverTimestamp();
      }

      await setDoc(reviewRef, payload, { merge: true });

      onSaved(itemIndex, { rating, comment: comment.trim() });
      onClose();
    } catch (err) {
      console.error("Error saving review:", err);
      setError("Couldn't save your review. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="review-modal">
        <button
          className="review-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <FaTimes />
        </button>

        <div className="review-modal-product">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="Custom T-Shirt" />
          ) : (
            <div className="no-image">No Preview</div>
          )}

          <div>
            <h3>{existingReview ? "Edit Your Review" : "Rate this Product"}</h3>
            <p>
              {item.text || "Custom T-Shirt"} · {item.size} · {item.tshirtColor}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="review-label">Your Rating</label>
          <StarRating value={rating} onChange={setRating} size={30} />

          <label className="review-label" htmlFor="review-comment">
            Your Review
          </label>
          <textarea
            id="review-comment"
            placeholder="Share your experience with this product..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />

          {error && <p className="review-error">{error}</p>}

          <div className="review-modal-actions">
            <button
              type="button"
              className="keep-order-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="confirm-review-btn"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : existingReview
                  ? "Update Review"
                  : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // { [itemIndex]: { rating, comment } } for the currently open order
  const [reviews, setReviews] = useState({});
  // { item, index } of the product currently being reviewed, or null
  const [reviewTarget, setReviewTarget] = useState(null);

  //cancel order
  const handleCancelOrder = async () => {
    try {
      const orderRef = doc(db, "orders", selectedOrder.id);
      await updateDoc(orderRef, {
        status: "Cancelled",
        cancelledAt: serverTimestamp(),
        cancelledBy: "user",
        cancellationReason: cancelReason || "No reason provided",
      });

      setShowCancelConfirm(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error cancelling order:", error);
      alert("Unable to cancel order. Please try again.");
    }
  };

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

  // Load existing reviews for the order currently open in the modal,
  // so items already reviewed show their rating instead of a write button.
  useEffect(() => {
    if (!selectedOrder || selectedOrder.status !== "Delivered") {
      setReviews({});
      return;
    }

    let cancelled = false;

    const fetchReviews = async () => {
      try {
        const q = query(
          collection(db, "reviews"),
          where("orderId", "==", selectedOrder.id),
        );
        const snapshot = await getDocs(q);

        if (cancelled) return;

        const map = {};
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          map[data.itemIndex] = {
            rating: data.rating,
            comment: data.comment,
          };
        });

        setReviews(map);
      } catch (error) {
        console.error("Error fetching reviews:", error);
      }
    };

    fetchReviews();

    return () => {
      cancelled = true;
    };
  }, [selectedOrder]);

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
              <OrderTracker order={selectedOrder} />

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
                    <p>Landmark : {selectedOrder.deliveryAddress.landmark}</p>
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

                      {selectedOrder.status === "Delivered" && (
                        <div className="product-review">
                          {reviews[index] ? (
                            <>
                              <StarRating
                                value={reviews[index].rating}
                                readOnly
                                size={15}
                              />
                              <button
                                className="edit-review-btn"
                                onClick={() => setReviewTarget({ item, index })}
                              >
                                <FaPen /> Edit Review
                              </button>
                            </>
                          ) : (
                            <button
                              className="write-review-btn"
                              onClick={() => setReviewTarget({ item, index })}
                            >
                              <FaStar /> Write a Review
                            </button>
                          )}
                        </div>
                      )}
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
              {canCancelOrder(selectedOrder.status) && (
                <button
                  className="cancel-order-btn"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  <FaBan />
                  Cancel Order
                </button>
              )}

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
      {showCancelConfirm && (
        <div className="modal-overlay">
          <div className="cancel-confirm-modal">
            <FaBan size={35} />

            <h2>Cancel Order?</h2>

            <p>
              Are you sure you want to cancel this order? This action cannot be
              undone.
            </p>
            <div className="cancel-reasons">
              <label>
                <input
                  type="radio"
                  name="reason"
                  value="Changed my mind"
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                Changed my mind
              </label>

              <label>
                <input
                  type="radio"
                  name="reason"
                  value="Wrong size selected"
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                Wrong size selected
              </label>

              <label>
                <input
                  type="radio"
                  name="reason"
                  value="Wrong design"
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                Wrong design
              </label>

              <label>
                <input
                  type="radio"
                  name="reason"
                  value="Ordered by mistake"
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                Ordered by mistake
              </label>
            </div>
            <div className="cancel-actions">
              <button
                className="keep-order-btn"
                onClick={() => setShowCancelConfirm(false)}
              >
                Keep Order
              </button>

              <button
                className="confirm-cancel-btn"
                onClick={handleCancelOrder}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewTarget && selectedOrder && (
        <ReviewModal
          order={selectedOrder}
          item={reviewTarget.item}
          itemIndex={reviewTarget.index}
          existingReview={reviews[reviewTarget.index]}
          onClose={() => setReviewTarget(null)}
          onSaved={(index, data) =>
            setReviews((prev) => ({ ...prev, [index]: data }))
          }
        />
      )}
    </div>
  );
};

export default MyOrders;
