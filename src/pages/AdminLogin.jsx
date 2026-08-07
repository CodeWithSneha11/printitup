import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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
      const { user } = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // Force a fresh ID token so newly-added admin claims are included.
      const tokenResult = await user.getIdTokenResult(true);

      if (tokenResult.claims.admin !== true) {
        setMessage("Access denied. You are not an admin.");
        await signOut(auth);
        return;
      }

      // Optional: fetch admin name for display.
      let adminName = user.email;

      try {
        const adminDoc = await getDoc(doc(db, "admins", user.uid));
        if (adminDoc.exists() && adminDoc.data().name) {
          adminName = adminDoc.data().name;
        }
      } catch {
        // Ignore if the document doesn't exist.
      }

      // Store session information for display purposes.
      localStorage.setItem("adminUid", user.uid);
      localStorage.setItem("adminEmail", user.email);
      localStorage.setItem("adminName", adminName);
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
    <div className="admin-login-page">
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