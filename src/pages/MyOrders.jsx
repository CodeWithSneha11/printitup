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
  FaPrint,
  FaInfoCircle,
  FaChevronDown,
} from "react-icons/fa";

import "../styles/MyOrders.css";
import { restockForCancelledOrder } from "../hooks/useStock";
// ---------------------------------------------------------------------------
// Order tracking config
// ---------------------------------------------------------------------------
// Edit these labels/order to match the exact status strings you save in Firestore.
// This mirrors the admin-side pipeline in Orders.jsx — keep both in sync.
const STATUS_FLOW = [
  { key: "Pending", label: "Order Placed", icon: <FaClipboardCheck /> },
  { key: "Confirmed", label: "Confirmed", icon: <FaCheck /> },
  { key: "Printing", label: "Printing", icon: <FaPrint /> },
  { key: "Shipped", label: "Shipped", icon: <FaBoxOpen /> },
  { key: "Out for Delivery", label: "Out for Delivery", icon: <FaTruck /> },
  { key: "Delivered", label: "Delivered", icon: <FaHome /> },
];

// Older orders in Firestore may still carry a status string from before we
// renamed "Processing" -> "Confirmed". Map legacy values here instead of
// touching historical documents.
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

// Cancellation is only allowed before production starts. Once an order
// moves to "Printing" (or beyond), the shirt is already on the press
// and can no longer be cancelled.
const canCancelOrder = (status) => {
  if (!status) return false;

  const normalized = status.toLowerCase();

  return normalized === "pending" || normalized === "confirmed";
};

// Statuses where the shirt is already in production/fulfillment — used
// to show a friendly "can't cancel anymore" note instead of just
// silently hiding the cancel button.
const isInProductionOrBeyond = (status) => {
  if (!status) return false;

  const normalized = LEGACY_STATUS_MAP[status] || status;

  return ["Printing", "Shipped", "Out for Delivery"].includes(normalized);
};

// Turns any status string into a safe, single CSS class token
// ("Out for Delivery" -> "out-for-delivery") so badge styling never breaks.
const toStatusClass = (status) =>
  (status || "unknown").toLowerCase().trim().replace(/\s+/g, "-");

const getOrderRef = (order) =>
  (order.orderId || order.id.slice(0, 8)).toString().toUpperCase();

const getShortOrderRef = (order) => {
  const ref = getOrderRef(order);
  return ref.length > 6 ? ref.slice(-6) : ref;
};

const StatusBadge = ({ status }) => (
  <span className={`myorders-badge myorders-badge--${toStatusClass(status)}`}>
    {status}
  </span>
);

// Full step tracker shown inside the order details modal
const OrderTracker = ({ order }) => {
  const currentIndex = getStepIndex(order.status);

  if (currentIndex === -1) {
    return (
      <div className="cancelled-tracker">
        <FaBan size={20} />

        <div className="cancelled-info">
          <h4>Order cancelled</h4>

          {order.cancellationReason && (
            <p>Reason: {order.cancellationReason}</p>
          )}
          {order.cancelledAt && (
            <p>
              Cancelled on{" "}
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

// ---------------------------------------------------------------------------
// Star rating
// ---------------------------------------------------------------------------
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
            className={`star ${filled ? "filled" : ""}`}
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

// ---------------------------------------------------------------------------
// Review modal (write / edit)
// ---------------------------------------------------------------------------
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
      // Deterministic doc ID (orderId_itemIndex) so re-submitting the same
      // item always updates the same review instead of creating duplicates.
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
      // TODO: wire up to centralized error logging (e.g. Sentry) once added.
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
            <h3>{existingReview ? "Edit your review" : "Rate this product"}</h3>
            <p>
              {item.text || "Custom T-Shirt"} · {item.size} · {item.tshirtColor}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="review-label">Your rating</label>
          <StarRating value={rating} onChange={setRating} size={28} />

          <label className="review-label" htmlFor="review-comment">
            Your review
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
              className="btn btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving
                ? "Saving..."
                : existingReview
                  ? "Update review"
                  : "Submit review"}
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

  // Pulls the fields decrementStockForOrder/restockForCancelledOrder need
  // out of an order's stored items. Only items carrying colorId are
  // included — collection-sourced items don't store one yet, so they're
  // skipped rather than throwing. Kept identical to the same helper in
  // Checkout.jsx so both stay in sync.
  const getStockItemsFromOrder = (items) =>
    (items || [])
      .filter(
        (item) =>
          item.colorId &&
          (item.size || item.sizeId) &&
          (item.neck || item.neckId),
      )
      .map((item) => ({
        colorId: item.colorId,
        sizeId: item.sizeId || item.size,
        neckId: item.neckId || item.neck,
        quantity: Number(item.quantity) || 1,
      }));

  /**
   * Cancels the currently selected order.
   *
   * Guarded twice by design:
   *  1. UI-level — the cancel action only renders once the user has
   *     scrolled to the bottom of the order details modal (see
   *     `.order-actions-zone` in JSX below), so it's never the first
   *     thing a user sees or taps by accident.
   *  2. Data-level — `canCancelOrder` is re-checked here in case the
   *     order moved into production (e.g. from another tab/device)
   *     between opening the modal and confirming cancellation.
   *
   * Stock is restocked BEFORE the order is marked Cancelled — if the
   * restock write fails, the order stays in its current status rather
   * than silently showing "Cancelled" while stock is still short.
   */
  const handleCancelOrder = async () => {
    if (!canCancelOrder(selectedOrder?.status)) {
      setShowCancelConfirm(false);
      return;
    }

    try {
      const stockItems = getStockItemsFromOrder(selectedOrder.items);
      if (stockItems.length > 0) {
        await restockForCancelledOrder(stockItems);
      }

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
      // TODO: replace alert() with the shared toast/notification component
      // once one exists in this codebase.
      console.error("Error cancelling order:", error);
      alert("Unable to cancel order. Please try again.");
    }
  };

  // Live subscription to the current user's orders. Using onSnapshot
  // (rather than a one-off getDocs) so status changes made by admin
  // staff reflect here in real time without a manual refresh.
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

      // Newest first.
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

    // Prevents a race where the modal is closed/reopened quickly and a
    // stale fetch resolves after a newer one, overwriting fresh state.
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
    return (
      <div className="myorders-loading">
        <span className="spinner" />
        Loading your orders...
      </div>
    );
  }

  return (
    <div className="myorders-page">
      <div className="myorders-header">
        <div>
          <h1>My Orders</h1>
          <p>Track and manage all your custom T-shirt orders</p>
        </div>

        <div className="orders-count">
          {orders.length} {orders.length === 1 ? "Order" : "Orders"}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="empty-orders">
          <FaShoppingBag size={48} />

          <h2>No orders yet</h2>

          <p>Your placed orders will appear here.</p>
        </div>
      ) : (
        <div className="orders-grid">
          {orders.map((order) => (
            <div className="order-card" key={order.id}>
              <div className="order-card-top">
                <StatusBadge status={order.status} />
                <span className="order-ref">#{getShortOrderRef(order)}</span>
              </div>

              <div className="order-card-main">
                <span className="order-total">₹{order.total}</span>
                <span className="order-card-date">
                  <FaCalendarAlt />
                  {order.createdAt?.toDate().toLocaleDateString()}
                </span>
              </div>

              <p className="order-card-meta">
                {order.items?.length}{" "}
                {order.items?.length === 1 ? "item" : "items"} · {order.payment}
              </p>

              <button
                className="btn btn-outline btn-block"
                onClick={() => setSelectedOrder(order)}
              >
                View order details
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ===================================================================
          ORDER DETAILS MODAL
          Cancel order is intentionally NOT in the sticky footer — it lives
          at the very bottom of the scrollable content (see
          `.order-actions-zone` below), past the tracker, contact info,
          product list, and price summary. This is deliberate friction:
          a user has to actually review their order before reaching the
          option to cancel it, rather than tapping it as a reflex.
      =================================================================== */}
      {selectedOrder && (
        <div className="modal-overlay">
          <div className="order-modal">
            <div className="modal-header">
              <div className="order-id-block">
                <span className="order-id-label">Order ID</span>
                <span className="order-id-value order-id-value-lg">
                  {getOrderRef(selectedOrder)}
                </span>
                <span className="modal-order-date">
                  Placed on {selectedOrder.createdAt?.toDate().toLocaleString()}
                </span>
              </div>

              <div className="header-right">
                <StatusBadge status={selectedOrder.status} />

                <button
                  className="close-btn"
                  onClick={() => setSelectedOrder(null)}
                  aria-label="Close order details"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="modal-content">
              <OrderTracker order={selectedOrder} />

              <div className="info-grid">
                <div className="info-card">
                  <h3>
                    <FaUser />
                    Contact
                  </h3>

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

                  <p className="no-icon">
                    <strong>{selectedOrder.deliveryAddress?.fullName}</strong>
                  </p>

                  <p className="no-icon">{selectedOrder.deliveryAddress?.phone}</p>

                  <p className="no-icon">
                    {selectedOrder.deliveryAddress?.house},{" "}
                    {selectedOrder.deliveryAddress?.area}
                  </p>

                  {selectedOrder.deliveryAddress?.landmark && (
                    <p className="no-icon">
                      Landmark: {selectedOrder.deliveryAddress.landmark}
                    </p>
                  )}

                  <p className="no-icon">
                    {selectedOrder.deliveryAddress?.city},{" "}
                    {selectedOrder.deliveryAddress?.state}
                  </p>

                  <p className="no-icon">{selectedOrder.deliveryAddress?.pincode}</p>
                </div>

                <div className="info-card">
                  <h3>
                    <FaCreditCard />
                    Payment
                  </h3>

                  <p className="no-icon">{selectedOrder.payment}</p>
                  <p className="no-icon">
                    {selectedOrder.status === "Delivered"
                      ? "Payment successful"
                      : "Pay on delivery"}
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
                                className="btn btn-text"
                                onClick={() => setReviewTarget({ item, index })}
                              >
                                <FaPen /> Edit review
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => setReviewTarget({ item, index })}
                            >
                              <FaStar /> Write a review
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
                  <span>Delivery charges</span>
                  <strong className="free">FREE</strong>
                </div>

                <div className="summary-row">
                  <span>GST</span>
                  <strong>Included</strong>
                </div>

                <hr />

                <div className="summary-row grand-total">
                  <span>Grand total</span>
                  <strong>₹{selectedOrder.total}</strong>
                </div>
              </div>

              {/* ---------------------------------------------------------
                  ORDER ACTIONS ZONE (cancel order)
                  Rendered as the LAST block inside the scrollable modal
                  content, after the full order summary. Visually set
                  apart with a "scroll to see more" style divider so it
                  doesn't read as a primary action.
              --------------------------------------------------------- */}
              <div className="order-actions-zone">
                <div className="order-actions-divider">
                  <span>Order actions</span>
                </div>

                {canCancelOrder(selectedOrder.status) && (
                  <div className="cancel-zone">
                    <div className="cancel-zone-text">
                      <h4>Need to cancel this order?</h4>
                      <p>
                        You can cancel until printing begins.
                        This action can't be undone.
                      </p>
                    </div>

                    <button
                      className="btn btn-danger-outline"
                      onClick={() => setShowCancelConfirm(true)}
                    >
                      <FaBan />
                      Cancel order
                    </button>
                  </div>
                )}

                {!canCancelOrder(selectedOrder.status) &&
                  isInProductionOrBeyond(selectedOrder.status) && (
                    <div className="no-cancel-note">
                      <FaInfoCircle />
                      Printing has started — this order can no longer be
                      cancelled.
                    </div>
                  )}
              </div>
            </div>

            {/* Footer only ever holds neutral navigation (Close) — no
                destructive action lives here anymore. */}
            <div className="modal-footer">
              <span className="modal-footer-hint">
                <FaChevronDown />
                Scroll down for order actions
              </span>

              <button
                className="btn btn-primary"
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
            <FaBan size={30} />

            <h2>Cancel this order?</h2>

            <p>
              This action cannot be undone. Let us know why you're cancelling:
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
                className="btn btn-ghost"
                onClick={() => setShowCancelConfirm(false)}
              >
                Keep order
              </button>

              <button className="btn btn-danger" onClick={handleCancelOrder}>
                Yes, cancel
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