import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

// Firebase Authentication
import { createUserWithEmailAndPassword } from "firebase/auth";

// Firebase Firestore
import { doc, setDoc } from "firebase/firestore";

import { auth, db } from "../firebase";

import "../styles/Auth.css";

function Signup() {
  // State variables for form inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // State for loading and error handling
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Used to navigate to another page after successful signup
  const navigate = useNavigate();

  // Handles user registration
  const handleSignup = async (e) => {
    e.preventDefault(); // Prevent page refresh

    setError("");

    // Check if passwords match
    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    // Validate minimum password length
    if (password.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    setLoading(true);

    try {
      // Create a new user using Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      const user = userCredential.user;

      // Save additional user details in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        email,
        createdAt: new Date(),
      });

      // Redirect to login page after successful signup
      navigate("/login");
    } catch (error) {
      // Display Firebase error message
      setError(error.message);
    } finally {
      // Stop loading whether success or failure
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleSignup}>
        {/* Page Heading */}
        <h2>Create Account 🚀</h2>

        <p className="auth-subtitle">Join PrintItUp today</p>

        {/* Display error message if any */}
        {error && <div className="error-box">{error}</div>}

        {/* Full Name Input */}
        <input
          type="text"
          placeholder="Full Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Email Input */}
        <input
          type="email"
          placeholder="Email Address"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password Input */}
        <input
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* Confirm Password Input */}
        <input
          type="password"
          placeholder="Confirm Password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {/* Submit Button */}
        <button type="submit" disabled={loading}>
          {loading ? "Creating Account..." : "Create Account"}
        </button>

        {/* Link to Login Page */}
        <p className="auth-switch">
          Already have an account?
          <Link to="/login"> Login</Link>
        </p>
      </form>
    </div>
  );
}

export default Signup;
