import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaShoppingCart, FaUserCircle, FaBars, FaTimes } from "react-icons/fa";
import "../styles/Navbar.css";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/">PrintItUp</Link>
      </div>

      <div className={`navbar-links ${menuOpen ? "active" : ""}`}>
        <Link
          to="/"
          className={location.pathname === "/" ? "active-link" : ""}
          onClick={() => setMenuOpen(false)}
        >
          Home
        </Link>

        {token && (
          <Link
            to="/customize"
            className={location.pathname === "/customize" ? "active-link" : ""}
            onClick={() => setMenuOpen(false)}
          >
            Customize
          </Link>
        )}

        {!token && (
          <>
            <Link
              to="/login"
              className={location.pathname === "/login" ? "active-link" : ""}
              onClick={() => setMenuOpen(false)}
            >
              Login
            </Link>
            <Link
              to="/signup"
              className={location.pathname === "/signup" ? "active-link" : ""}
              onClick={() => setMenuOpen(false)}
            >
              Sign Up
            </Link>
          </>
        )}

        {token && (
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        )}

        <Link to="/cart" className="cart-icon" onClick={() => setMenuOpen(false)}>
          <FaShoppingCart />
        </Link>
      </div>

      <div className="navbar-toggle" onClick={toggleMenu}>
        {menuOpen ? <FaTimes /> : <FaBars />}
      </div>
    </nav>
  );
}

export default Navbar;
