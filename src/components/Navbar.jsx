import { Link, useNavigate } from "react-router-dom";
import { isLoggedIn, logoutUser } from "../utils/auth";
import "../styles/Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();

  const handleLogout = () => {
    logoutUser();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="logo">PrintItUp</div>

      <ul className="nav-links">
        <li><Link to="/">Home</Link></li>

        {loggedIn ? (
          <>
            <li><Link to="/customize">Customize</Link></li>
            <li>
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </li>
          </>
        ) : (
          <>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/signup">Signup</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
