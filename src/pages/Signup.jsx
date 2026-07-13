import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

// Firebase Authentication
import { createUserWithEmailAndPassword } from "firebase/auth";

// Firebase Firestore
import { doc, setDoc } from "firebase/firestore";

import { auth, db } from "../firebase";

import "../styles/Auth.css";

function Signup() {
  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Loading & Error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    setError("");

    // Password Validation
    if (password.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    setLoading(true);

    try {
      // Create User
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      // Save User in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        email,
        createdAt: new Date(),
      });

      // Login page
      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleSignup}>
        <h2>Create Account 🚀</h2>

        <p className="auth-subtitle">
          Join PrintItUp today
        </p>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        {/* Full Name */}
        <input
          type="text"
          placeholder="Full Name"
          required
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
        />

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
        <input
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Creating Account..."
            : "Create Account"}
        </button>

        <p className="auth-switch">
          Already have an account?
          <Link to="/login"> Login</Link>
        </p>
      </form>
    </div>
  );
}

export default Signup;