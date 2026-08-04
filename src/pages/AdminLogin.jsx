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

      // The `admin` custom claim lives on the ID token itself — it's
      // set server-side (see server/scripts/setAdminClaim.js) and
      // can't be forged from the client. `true` forces a fresh token
      // fetch, since a cached one could predate the claim being set.
      const tokenResult = await user.getIdTokenResult(true);

      if (tokenResult.claims.admin !== true) {
        setMessage("Access denied. You are not an admin.");
        await signOut(auth);
        return;
      }

      // Best-effort display name only — not part of the access check.
      let adminName = user.email;
      try {
        const adminDoc = await getDoc(doc(db, "admins", user.uid));
        if (adminDoc.exists() && adminDoc.data().name) {
          adminName = adminDoc.data().name;
        }
      } catch {
        // Non-fatal: the login itself already succeeded via the claim check.
      }
      localStorage.setItem("adminName", adminName);

      // Save session (AdminRoute re-verifies the claim independently;
      // these are only used for display/convenience elsewhere in the UI).
      localStorage.setItem("adminUid", user.uid);
      localStorage.setItem("adminEmail", user.email);
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