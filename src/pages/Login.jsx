import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// Firebase Authentication
import { signInWithEmailAndPassword } from "firebase/auth";

import { auth } from "../firebase";

import "../styles/Auth.css";

function Login() {
  // State variables for form inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Controls password visibility
  const [showPassword, setShowPassword] = useState(false);

  // State for loading and error handling
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Used to navigate after successful login
  const navigate = useNavigate();

  // Handles user login
  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent page refresh

    setError("");
    setLoading(true);

    try {
      // Authenticate user with Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // Store logged-in user's UID in local storage
      localStorage.setItem("uid", userCredential.user.uid);

      // Redirect to home page
      navigate("/");
    } catch (err) {
      // Display login error message
      setError("Invalid email or password");
    } finally {
      // Stop loading after login attempt
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleLogin}>
        {/* Page Heading */}
        <h2>Welcome Back 👋</h2>

        <p className="auth-subtitle">Login to continue designing</p>

        {/* Display error message if login fails */}
        {error && <div className="error-box">{error}</div>}

        {/* Email Input */}
        <input
          type="email"
          placeholder="Email Address"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password Input with Show/Hide Toggle */}
        <div className="password-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* Toggle password visibility */}
          <span
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "🙈" : "👁"}
          </span>
        </div>

        {/* Login Button */}
        <button type="submit" disabled={loading}>
          {loading ? "Logging In..." : "Login"}
        </button>

        {/* Link to Signup Page */}
        <p className="auth-switch">
          Don't have an account?
          <Link to="/signup"> Sign Up</Link>
        </p>
      </form>
    </div>
  );
}

export default Login;
