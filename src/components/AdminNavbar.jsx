import React, { useState, useRef, useEffect } from "react";
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
  FaUserCircle,
  FaCog,
  FaSignOutAlt,
  FaBars,
  FaTimes,
} from "react-icons/fa";

import { auth, db } from "../firebase";

import "../styles/AdminNavbar.css";

const SEEN_KEY = "adminNotifSeenAt";

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

  const [showMenu, setShowMenu] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const [search, setSearch] = useState("");

 
  const [pendingOrders, setPendingOrders] = useState([]);


  const [newOrderIds, setNewOrderIds] = useState(new Set());

  const [lastSeenAt, setLastSeenAt] = useState(
    Number(localStorage.getItem(SEEN_KEY)) || 0
  );

  const [adminName] = useState(
    localStorage.getItem("adminName") || "Admin"
  );
  const [adminEmail] = useState(
    localStorage.getItem("adminEmail") || ""
  );

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
      limit(8)
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

  const unseenCount = pendingOrders.filter(
    (order) =>
      newOrderIds.has(order.id) &&
      (order.createdAt?.seconds || 0) > lastSeenAt
  ).length;

  const toggleNotifications = () => {
    setShowMenu(false);

    setShowNotif((prev) => {
      const next = !prev;

  
      if (next) {
        const now = Date.now() / 1000;
        localStorage.setItem(SEEN_KEY, now);
        setLastSeenAt(now);
      }

      return next;
    });
  };

  // ==========================
  // OUTSIDE CLICK / ESCAPE
  // ==========================

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setShowMenu(false);
      }

      if (
        notifRef.current &&
        !notifRef.current.contains(event.target)
      ) {
        setShowNotif(false);
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
            placeholder="Search products, orders..."
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
                <h4>Pending Orders</h4>
                <span>{pendingOrders.length}</span>
              </div>

              <div className="notif-list">
                {pendingOrders.length === 0 ? (
                  <p className="notif-empty">
                    You're all caught up — no pending orders.
                  </p>
                ) : (
                  pendingOrders.map((order) => (
                    <button
                      key={order.id}
                      className={`notif-item${
                        newOrderIds.has(order.id) ? " notif-item-new" : ""
                      }`}
                      onClick={() => {
                        navigate("/admin-dashboard/orders");
                        setShowNotif(false);
                      }}
                    >
                      <div className="notif-item-avatar">
                        {(order.customer?.name || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="notif-item-body">
                        <p>
                          <strong>
                            {order.customer?.name || "New order"}
                          </strong>{" "}
                          placed an order
                        </p>
                        <span>
                          {timeAgo(order.createdAt?.seconds)} · ₹
                          {order.total}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <button
                className="notif-view-all"
                onClick={() => {
                  navigate("/admin-dashboard/orders");
                  setShowNotif(false);
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
                  navigate("/admin-dashboard/profile");
                  setShowMenu(false);
                }}
              >
                <FaUserCircle />
                Profile
              </button>

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
            placeholder="Search products, orders..."
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