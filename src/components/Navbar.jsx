import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

import { signOut, onAuthStateChanged } from "firebase/auth";

import { auth, db } from "../firebase";

import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  orderBy,
  updateDoc,
} from "firebase/firestore";

import {
  FaUser,
  FaShoppingBag,
  FaSignOutAlt,
  FaMapMarkerAlt,
  FaBell,
} from "react-icons/fa";

import "../styles/Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();

  const location = useLocation();

  const profileRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [cartCount, setCartCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const [user, setUser] = useState(null);

  const [userName, setUserName] = useState("");

  const uid = user?.uid;

  const loggedIn = !!user;

  /*
  ===========================
      AUTH LISTENER
  ===========================
  */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      setShowProfileMenu(false);
    });

    return unsubscribe;
  }, []);

  /*
  ===========================
      CLOSE MENU ON ROUTE CHANGE
  ===========================
  */

  useEffect(() => {
    setShowProfileMenu(false);

    setMenuOpen(false);
  }, [location]);

  /*
  ===========================
      FETCH USER NAME
  ===========================
  */

  useEffect(() => {
    const fetchUser = async () => {
      if (!user) {
        setUserName("");

        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (snap.exists()) {
          setUserName(snap.data().name || "");
        } else {
          setUserName("");
        }
      } catch (error) {
        console.log(error);
      }
    };

    fetchUser();
  }, [user]);

  /*
  ===========================
      CART COUNT
  ===========================
  */

  useEffect(() => {
    if (!uid) {
      setCartCount(0);

      return;
    }

    const q = query(collection(db, "cart"), where("uid", "==", uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCartCount(snapshot.size);
    });

    return unsubscribe;
  }, [uid]);
  /*
===========================
    NOTIFICATIONS
===========================
*/

  useEffect(() => {
    if (!uid) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, "notifications"),

      where("userId", "==", uid),

      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setNotifications(data);
    });

    return unsubscribe;
  }, [uid]);

  /*
  ===========================
      CLOSE PROFILE OUTSIDE CLICK
  ===========================
  */

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  /*
===========================
    MARK NOTIFICATIONS READ
===========================
*/

  const markNotificationsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((item) => !item.read);

      for (const item of unreadNotifications) {
        await updateDoc(doc(db, "notifications", item.id), {
          read: true,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  /*
  ===========================
      LOGOUT
  ===========================
  */

  const handleLogout = async () => {
    try {
      await signOut(auth);

      localStorage.removeItem("uid");

      localStorage.removeItem("email");

      localStorage.removeItem("adminUid");

      localStorage.removeItem("adminEmail");

      setShowProfileMenu(false);

      navigate("/login");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <nav className="navbar">
      {/* LOGO */}

      <div className="logo">
        <Link to="/">PrintItUp</Link>
      </div>

      {/* MOBILE MENU */}

      <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
        ☰
      </div>

      <ul className={menuOpen ? "nav-links active" : "nav-links"}>
        <li>
          <Link to="/">Home</Link>
        </li>

        {/* CUSTOMER COLLECTIONS */}

        <li>
          <Link to="/collections">Collections</Link>
        </li>

        {loggedIn && (
          <>
            <li>
              <Link to="/customize">Customize</Link>
            </li>

            <li>
              <Link to="/my-designs">My Designs</Link>
            </li>
            <li className="notification-wrapper">
              <div
                className="notification-icon"
                onClick={() => {
                  setShowNotifications((prev) => !prev);

                  markNotificationsRead();
                }}
              >
                <FaBell />

                {notifications.filter((item) => !item.read).length > 0 && (
                  <span className="notification-badge">
                    {notifications.filter((item) => !item.read).length}
                  </span>
                )}

                {showNotifications && (
                  <div className="notification-dropdown">
                    {notifications.length === 0 ? (
                      <p>No notifications</p>
                    ) : (
                      notifications.map((item) => (
                        <div className="notification-item" key={item.id}>
                          <h4>{item.title}</h4>

                          <p>{item.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </li>

            <li>
              <Link to="/cart" className="cart-link">
                🛒 Cart
                {cartCount > 0 && (
                  <span className="cart-badge">{cartCount}</span>
                )}
              </Link>
            </li>
          </>
        )}

        {!loggedIn ? (
          <>
            <li>
              <Link to="/login">Login</Link>
            </li>

            <li>
              <Link to="/signup">Signup</Link>
            </li>
          </>
        ) : (
          <li className="profile-menu" ref={profileRef}>
            <div
              className="profile-avatar-nav"
              onClick={() => setShowProfileMenu((prev) => !prev)}
            >
              {userName ? userName.charAt(0).toUpperCase() : <FaUser />}
            </div>

            {showProfileMenu && (
              <div className="profile-dropdown">
                <div className="dropdown-user">
                  <div className="profile-avatar-large">
                    {userName ? userName.charAt(0).toUpperCase() : <FaUser />}
                  </div>

                  <h4>{userName || "Customer"}</h4>

                  <p>{user?.email}</p>
                </div>

                <Link to="/profile">
                  <FaUser />
                  My Profile
                </Link>

                <Link to="/my-orders">
                  <FaShoppingBag />
                  My Orders
                </Link>

                <Link to="/manage-address">
                  <FaMapMarkerAlt />
                  Manage Addresses
                </Link>

                <button onClick={handleLogout}>
                  <FaSignOutAlt />
                  Logout
                </button>
              </div>
            )}
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
