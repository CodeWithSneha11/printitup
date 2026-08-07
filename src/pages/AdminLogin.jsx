import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import "../styles/AdminLogin.css";

const AdminLogin = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      // Authenticate with Firebase
      const { user } = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // Fetch admin document using UID
      const adminRef = doc(db, "admins", user.uid);
      const adminSnap = await getDoc(adminRef);

      // Admin document doesn't exist
      if (!adminSnap.exists()) {
        await signOut(auth);
        setMessage("Access denied. You are not an admin.");
        return;
      }

      const adminData = adminSnap.data();

      // Validate role
      if (adminData.role !== "admin") {
        await signOut(auth);
        setMessage("Invalid admin account.");
        return;
      }

      // Clear any previous session values
      localStorage.removeItem("adminUid");
      localStorage.removeItem("adminEmail");
      localStorage.removeItem("adminName");
      localStorage.removeItem("uid");
      localStorage.removeItem("email");

      // Save admin session
      localStorage.setItem("adminUid", user.uid);
      localStorage.setItem("adminEmail", user.email);
      localStorage.setItem("adminName", adminData.name || "Admin");

      // Save common session (used elsewhere in your app)
      localStorage.setItem("uid", user.uid);
      localStorage.setItem("email", user.email);

      setMessage("Login successful!");

      setTimeout(() => {
        navigate("/admin-dashboard", { replace: true });
      }, 1000);
    } catch (error) {
      console.error("Admin login error:", error);

      switch (error.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
          setMessage("Invalid email or password.");
          break;

        case "auth/user-not-found":
          setMessage("Admin account not found.");
          break;

        case "auth/too-many-requests":
          setMessage("Too many login attempts. Please try again later.");
          break;

        case "auth/network-request-failed":
          setMessage("Network error. Please check your internet connection.");
          break;

        default:
          setMessage("Unable to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <h1>PrintItUp Admin</h1>

        <p>Login to manage your store</p>

        {message && <div className="admin-message">{message}</div>}

        <form onSubmit={handleLogin}>
          <label>Email</label>

          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;