import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import {
  FaBell,
  FaSearch,
  FaCog,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaBan,
} from "react-icons/fa";

import { auth, db } from "../firebase";

import "../styles/AdminNavbar.css";

// "3m ago" / "2h ago" / "5d ago"
const timeAgo = (seconds) => {
  if (!seconds) return "";

  const diff = Date.now() / 1000 - seconds;

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const AdminNavbar = ({ onToggleSidebar }) => {
  const navigate = useNavigate();

  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const mobileSearchRef = useRef(null);

  const mountTimeRef = useRef(Date.now() / 1000);

  // Cancelled-order query has no reliable "created" timestamp to compare
  // against mount time (the order itself may be old — only its status
  // just changed), so we skip flagging anything on the first snapshot
  // and treat every doc that enters the result set afterwards as new.
  const isInitialCancelledRef = useRef(true);
  const cancelledDetectedAtRef = useRef({});

  const [showMenu, setShowMenu] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const [search, setSearch] = useState("");

  const [pendingOrders, setPendingOrders] = useState([]);
  const [cancelledOrders, setCancelledOrders] = useState([]);

  const [newOrderIds, setNewOrderIds] = useState(new Set());
  const [newCancelledIds, setNewCancelledIds] = useState(new Set());

  const [adminName] = useState(localStorage.getItem("adminName") || "Admin");
  const [adminEmail] = useState(localStorage.getItem("adminEmail") || "");

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ==========================
  // LIVE "NEW ORDER" NOTIFICATIONS
  // ==========================

  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("status", "==", "Pending"),
      orderBy("createdAt", "desc"),
      limit(8),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setPendingOrders(data);

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const order = change.doc.data();
          const createdAt = order.createdAt?.seconds || 0;

          if (createdAt > mountTimeRef.current) {
            setNewOrderIds((prev) => {
              const next = new Set(prev);
              next.add(change.doc.id);
              return next;
            });
          }
        }
      });
    });

    return () => unsubscribe();
  }, []);

  // ==========================
  // LIVE "ORDER CANCELLED" NOTIFICATIONS
  // ==========================

  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("status", "==", "Cancelled"),
      orderBy("createdAt", "desc"),
      limit(8),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setCancelledOrders(data);

      // Skip the very first snapshot — it just represents orders that
      // were already cancelled before this admin session started.
      if (!isInitialCancelledRef.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const order = change.doc.data();

            // Capture a client-side "seen at" fallback in case the order
            // document has no updatedAt/cancelledAt timestamp of its own.
            if (!order.updatedAt?.seconds && !order.cancelledAt?.seconds) {
              cancelledDetectedAtRef.current[change.doc.id] = Date.now() / 1000;
            }

            setNewCancelledIds((prev) => {
              const next = new Set(prev);
              next.add(change.doc.id);
              return next;
            });
          }
        });
      }

      isInitialCancelledRef.current = false;
    });

    return () => unsubscribe();
  }, []);

  // Best-known timestamp for a cancelled order's cancellation event.
  const cancelledEventTime = (order) =>
    order.cancelledAt?.seconds ||
    order.updatedAt?.seconds ||
    cancelledDetectedAtRef.current[order.id] ||
    order.createdAt?.seconds ||
    0;

  // Merge pending + cancelled into one feed, newest first.
  const notifications = useMemo(() => {
    const newItems = pendingOrders.map((order) => ({
      ...order,
      _type: "new",
      _time: order.createdAt?.seconds || 0,
    }));

    const cancelledItems = cancelledOrders.map((order) => ({
      ...order,
      _type: "cancelled",
      _time: cancelledEventTime(order),
    }));

    return [...newItems, ...cancelledItems].sort((a, b) => b._time - a._time);
  }, [pendingOrders, cancelledOrders]);

  const unseenCount = notifications.filter((order) =>
    order._type === "new"
      ? newOrderIds.has(order.id)
      : newCancelledIds.has(order.id),
  ).length;

  // Closing the panel = "seen". Clears both the badge count and the
  // per-item highlight together, so nothing stays flagged forever.
  const closeNotifications = () => {
    setShowNotif(false);
    setNewOrderIds(new Set());
    setNewCancelledIds(new Set());
  };

  const toggleNotifications = () => {
    setShowMenu(false);

    setShowNotif((prev) => {
      const next = !prev;

      if (!next) {
        setNewOrderIds(new Set());
        setNewCancelledIds(new Set());
      }

      return next;
    });
  };

  // ==========================
  // OUTSIDE CLICK / ESCAPE
  // ==========================

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowMenu(false);
      }

      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotif(false);
        setNewOrderIds(new Set());
        setNewCancelledIds(new Set());
      }

      if (
        mobileSearchRef.current &&
        !mobileSearchRef.current.contains(event.target)
      ) {
        setShowMobileSearch(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowMenu(false);
        setShowNotif(false);
        setNewOrderIds(new Set());
        setNewCancelledIds(new Set());
        setShowMobileSearch(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // ==========================
  // SEARCH
  // ==========================

  const runSearch = () => {
    if (!search.trim()) return;

    navigate(`/admin-dashboard/search?q=${encodeURIComponent(search)}`);
    setShowMobileSearch(false);
  };

  // ==========================
  // LOGOUT
  // ==========================

  const handleLogout = async () => {
    try {
      await signOut(auth);

      localStorage.removeItem("adminUid");
      localStorage.removeItem("adminEmail");
      localStorage.removeItem("adminName");

      localStorage.removeItem("uid");
      localStorage.removeItem("email");

      navigate("/admin-login");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="admin-navbar">
      <div className="navbar-left">
        {onToggleSidebar && (
          <button
            className="hamburger-btn"
            aria-label="Toggle menu"
            onClick={onToggleSidebar}
          >
            <FaBars />
          </button>
        )}

        <div className="navbar-title">
          <p>{today}</p>
        </div>
      </div>

      <div className="navbar-center">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="Search products, collections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
          />
          {search && (
            <button
              className="search-clear"
              aria-label="Clear search"
              onClick={() => setSearch("")}
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      <div className="navbar-right">
        {/* Mobile search trigger */}
        <button
          className="icon-btn search-toggle-btn"
          aria-label="Search"
          onClick={() => setShowMobileSearch(true)}
        >
          <FaSearch />
        </button>

        <div className="admin-notif" ref={notifRef}>
          <button
            className="icon-btn notification-btn"
            aria-label="Notifications"
            onClick={toggleNotifications}
          >
            <FaBell />
            {unseenCount > 0 && (
              <span className="notification-dot">
                {unseenCount > 9 ? "9+" : unseenCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <h4>Order Updates</h4>
                <span>{notifications.length}</span>
              </div>

              <div className="notif-list">
                {notifications.length === 0 ? (
                  <p className="notif-empty">
                    You're all caught up — no order updates.
                  </p>
                ) : (
                  notifications.map((order) => {
                    const isCancelled = order._type === "cancelled";
                    const isNew = isCancelled
                      ? newCancelledIds.has(order.id)
                      : newOrderIds.has(order.id);

                    return (
                      <button
                        key={`${order._type}-${order.id}`}
                        className={`notif-item${
                          isNew ? " notif-item-new" : ""
                        }${isCancelled ? " notif-item-cancelled" : ""}`}
                        onClick={() => {
                          navigate("/admin-dashboard/orders");
                          closeNotifications();
                        }}
                      >
                        <div className="notif-item-avatar">
                          {isCancelled ? (
                            <FaBan />
                          ) : (
                            (order.customer?.name || "?").charAt(0).toUpperCase()
                          )}
                        </div>

                        <div className="notif-item-body">
                          <p>
                            <strong>
                              {order.customer?.name || "A customer"}
                            </strong>{" "}
                            {isCancelled
                              ? "cancelled their order"
                              : "placed an order"}
                          </p>
                          <span>
                            {timeAgo(order._time)} · ₹{order.total}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <button
                className="notif-view-all"
                onClick={() => {
                  navigate("/admin-dashboard/orders");
                  closeNotifications();
                }}
              >
                View all orders
              </button>
            </div>
          )}
        </div>

        <div className="admin-profile" ref={profileRef}>
          <div
            className="admin-avatar"
            role="button"
            tabIndex={0}
            aria-haspopup="true"
            aria-expanded={showMenu}
            onClick={() => {
              setShowNotif(false);
              setShowMenu((prev) => !prev);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setShowNotif(false);
                setShowMenu((prev) => !prev);
              }
            }}
          >
            {adminName.charAt(0).toUpperCase()}
          </div>

          {showMenu && (
            <div className="admin-dropdown">
              <div className="admin-dropdown-header">
                <div className="admin-avatar-large">
                  {adminName.charAt(0).toUpperCase()}
                </div>

                <h4>{adminName}</h4>
                <p>{adminEmail}</p>
              </div>

              <button
                onClick={() => {
                  navigate("/admin-dashboard/settings");
                  setShowMenu(false);
                }}
              >
                <FaCog />
                Settings
              </button>

              <button className="logout-btn" onClick={handleLogout}>
                <FaSignOutAlt />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile search overlay */}
      {showMobileSearch && (
        <div className="mobile-search-overlay" ref={mobileSearchRef}>
          <FaSearch />
          <input
            autoFocus
            type="text"
            placeholder="Search products, or collections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
          />
          <button
            aria-label="Close search"
            onClick={() => setShowMobileSearch(false)}
          >
            <FaTimes />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminNavbar;