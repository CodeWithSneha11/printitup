import React, { useState, useEffect,useRef  } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";

import {
  FaUser,
  FaShoppingBag,
  FaSignOutAlt,
} from "react-icons/fa";
import "../styles/Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const [cartCount, setCartCount] = useState(0);

  const [user, setUser] = useState(null);
  const profileRef = useRef(null);
  
  const [userName, setUserName] = useState("");
const [showProfileMenu, setShowProfileMenu] = useState(false);

  const uid = user?.uid;
  const loggedIn = !!user;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    

    return () => unsubscribe();
  }, []);
useEffect(() => {
  const fetchUser = async () => {
    if (!user) return;

    try {
      const snap = await getDoc(doc(db, "users", user.uid));

      if (snap.exists()) {
        setUserName(snap.data().name || "");
      }
    } catch (error) {
      console.log(error);
    }
  };

  fetchUser();
}, [user]);
  //  REAL-TIME CART COUNTER
  useEffect(() => {
    if (!uid) {
      setCartCount(0);
      return;
    }

    const q = query(collection(db, "cart"), where("uid", "==", uid));

    //  LIVE LISTENER
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCartCount(snapshot.size);
    });

    // cleanup listener
    return () => unsubscribe();
  }, [uid]);
useEffect(() => {
  const handleClickOutside = (event) => {

    if (
      profileRef.current &&
      !profileRef.current.contains(event.target)
    ) {
      setShowProfileMenu(false);
    }

  };

  document.addEventListener(
    "mousedown",
    handleClickOutside
  );

  return () => {
    document.removeEventListener(
      "mousedown",
      handleClickOutside
    );
  };
}, []);
  //  LOGOUT
  const handleLogout = async () => {
  await signOut(auth);

  localStorage.removeItem("uid");
  localStorage.removeItem("email");
  localStorage.removeItem("adminUid");
  localStorage.removeItem("adminEmail");

  navigate("/login");
};

  return (
    <nav className="navbar">
      {/* LOGO */}
      <div className="logo">
        <Link to="/">PrintItUp</Link>
      </div>

      {/* HAMBURGER */}
      <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
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

            {/*  CART WITH LIVE BADGE */}
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
    <li
  className="profile-menu"
  ref={profileRef}
>

  <div
    className="profile-avatar-nav"
    onClick={() =>
      setShowProfileMenu(!showProfileMenu)
    }
  >
    {userName ? (
      userName.charAt(0).toUpperCase()
    ) : (
      <FaUser />
    )}
  </div>

  {showProfileMenu && (

    <div className="profile-dropdown">

      <div className="dropdown-user">

        <div className="profile-avatar-large">

          {userName ? (
            userName.charAt(0).toUpperCase()
          ) : (
            <FaUser />
          )}

        </div>

        <h4>{userName || "Customer"}</h4>

        <p>{user?.email}</p>

      </div>

      <Link
        to="/profile"
        onClick={() => setShowProfileMenu(false)}
      >
        <FaUser />
        My Profile
      </Link>

      <Link
        to="/my-orders"
        onClick={() => setShowProfileMenu(false)}
      >
        <FaShoppingBag />
        My Orders
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
