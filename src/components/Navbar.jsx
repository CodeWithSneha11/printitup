import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import "../styles/Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);

  const loggedIn = localStorage.getItem("uid");

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

      <div className="logo">
        <Link to="/">PrintItUp</Link>
      </div>

      <div
        className="hamburger"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        ☰
      </div>

      <ul
        className={
          menuOpen
            ? "nav-links active"
            : "nav-links"
        }
      >
        <li>
          <Link to="/">Home</Link>
        </li>

        {loggedIn && (
          <>
            <li>
              <Link to="/customize">
                Customize
              </Link>
            </li>

            <li>
              <Link to="/my-designs">
                My Designs
              </Link>
            </li>
          </>
        )}

        {!loggedIn ? (
          <>
            <li>
              <Link to="/login">
                Login
              </Link>
            </li>

            <li>
              <Link to="/signup">
                Signup
              </Link>
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