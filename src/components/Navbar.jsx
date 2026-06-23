import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import "../styles/Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();

  const loggedIn = localStorage.getItem("uid");

  const handleLogout = async () => {
    try {
      await signOut(auth);

      localStorage.removeItem("uid");

      alert("Logged out successfully");

      navigate("/login");
    } catch (error) {
      console.error(error);
      alert("Logout failed");
    }
  };

  return (
    <nav className="navbar">
      <div className="logo">
        <Link to="/">PrintItUp</Link>
      </div>

      <ul className="nav-links">
        <li>
          <Link to="/">Home</Link>
        </li>

        {loggedIn && (
          <li>
            <Link to="/customize">Customize</Link>
          </li>
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