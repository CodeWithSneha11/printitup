import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot
} from "firebase/firestore";
import "../styles/Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const [cartCount, setCartCount] = useState(0);

  const uid = localStorage.getItem("uid");
  const loggedIn = localStorage.getItem("uid");

  // 🛒 REAL-TIME CART COUNTER
  useEffect(() => {
    if (!uid) {
      setCartCount(0);
      return;
    }

    const q = query(
      collection(db, "cart"),
      where("uid", "==", uid)
    );

    // 🔥 LIVE LISTENER
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCartCount(snapshot.size);
    });

    // cleanup listener
    return () => unsubscribe();
  }, [uid]);

  // 🚪 LOGOUT
  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("uid");
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

      {/* HAMBURGER */}
      <div
        className="hamburger"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        ☰
      </div>

      {/* NAV LINKS */}
      <ul className={menuOpen ? "nav-links active" : "nav-links"}>

        {/* HOME */}
        <li>
          <Link to="/">Home</Link>
        </li>

        {/* LOGGED IN LINKS */}
        {loggedIn && (
          <>
            <li>
              <Link to="/customize">Customize</Link>
            </li>

            <li>
              <Link to="/my-designs">My Designs</Link>
            </li>

            {/* 🛒 CART WITH LIVE BADGE */}
            <li>
              <Link to="/cart" className="cart-link">
                🛒 Cart

                {cartCount > 0 && (
                  <span className="cart-badge">
                    {cartCount}
                  </span>
                )}
              </Link>
            </li>
          </>
        )}

        {/* LOGIN / SIGNUP OR LOGOUT */}
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
          <li>
            <button
              className="logout-btn"
              onClick={handleLogout}
            >
              Logout
            </button>
          </li>
        )}

      </ul>

    </nav>
  );
};

export default Navbar;