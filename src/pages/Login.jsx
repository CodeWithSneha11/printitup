import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";

import {
  auth,
  db,
  googleProvider,
} from "../firebase";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { FaGoogle } from "react-icons/fa";

import "../styles/Auth.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  // -------------------------
  // Email Login
  // -------------------------

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);

    setError("");

    try {
      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      const user = userCredential.user;

      localStorage.setItem("uid", user.uid);

      navigate("/");
    } catch (err) {
      console.log(err);

      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Google Login
  // -------------------------

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      setError("");

      const result = await signInWithPopup(
        auth,
        googleProvider
      );

      const user = result.user;

      localStorage.setItem("uid", user.uid);

      // Check Firestore
      const userRef = doc(db, "users", user.uid);

      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,

          name: user.displayName || "",

          email: user.email,

          phone: "",

          createdAt: serverTimestamp(),
        });
      }

      navigate("/");
    } catch (err) {
      console.log(err);

      setError("Google Sign-In failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form
        className="auth-card"
        onSubmit={handleLogin}
      >
        <h2>Welcome Back 👋</h2>

        <p className="auth-subtitle">
          Login to continue designing
        </p>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        {/* Email */}

        <input
          type="email"
          placeholder="Email Address"
          required
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
        />

        {/* Password */}

        <div className="password-wrapper">
          <input
            type={
              showPassword
                ? "text"
                : "password"
            }
            placeholder="Password"
            required
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />

          <span
            className="toggle-password"
            onClick={() =>
              setShowPassword(
                !showPassword
              )
            }
          >
            {showPassword ? "🙈" : "👁"}
          </span>
        </div>

        {/* Email Login */}

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Logging In..."
            : "Login"}
        </button>

        {/* Divider */}

        <div className="auth-divider">
          <span>OR</span>
        </div>

        {/* Google Login */}

        <button
          type="button"
          className="google-login-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <FaGoogle />

          Continue with Google
        </button>

        {/* Signup */}

        <p className="auth-switch">
          Don't have an account?

          <Link to="/signup">
            {" "}
            Sign Up
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Login;