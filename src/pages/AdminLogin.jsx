import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
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

    try {
      setLoading(true);
      setMessage("");

      // Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      // Check Firestore admins collection using email
      const q = query(
        collection(db, "admins"),
        where("email", "==", user.email)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setMessage("Access denied. You are not an admin.");
        return;
      }

      // Read admin document
      const adminData = snapshot.docs[0].data();
localStorage.setItem("adminName", adminData.name || "Admin");

      if (adminData.role !== "admin") {
        setMessage("Invalid admin account.");
        return;
      }

      // Save session
      localStorage.setItem("adminUid", user.uid);
      localStorage.setItem("adminEmail", user.email);

      // Also save normal session (AdminRoute uses these)
      localStorage.setItem("uid", user.uid);
      localStorage.setItem("email", user.email);

      setMessage("Login successful!");

      setTimeout(() => {
        navigate("/admin-dashboard");
      }, 1000);

    } catch (error) {
      console.log(error);

      switch (error.code) {
        case "auth/invalid-credential":
          setMessage("Invalid email or password.");
          break;

        case "auth/user-not-found":
          setMessage("Admin account not found.");
          break;

        case "auth/wrong-password":
          setMessage("Incorrect password.");
          break;

        case "auth/too-many-requests":
          setMessage("Too many attempts. Please try again later.");
          break;

        default:
          setMessage(error.message);
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

        {message && (
          <div className="admin-message">
            {message}
          </div>
        )}

        <form onSubmit={handleLogin}>

          <label>Email</label>

          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

      </div>
    </div>
  );
};

export default AdminLogin;