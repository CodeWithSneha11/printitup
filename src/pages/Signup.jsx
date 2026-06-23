import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import {
  createUserWithEmailAndPassword
} from "firebase/auth";

import {
  doc,
  setDoc
} from "firebase/firestore";

import {
  auth,
  db
} from "../firebase";

import "../styles/Auth.css";

function Signup() {

  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [confirmPassword,setConfirmPassword] =
    useState("");

  const [loading,setLoading] = useState(false);

  const [error,setError] = useState("");

  const navigate = useNavigate();

  const handleSignup = async (e) => {

    e.preventDefault();

    setError("");

    if(password !== confirmPassword){
      return setError(
        "Passwords do not match"
      );
    }

    if(password.length < 6){
      return setError(
        "Password must be at least 6 characters"
      );
    }

    setLoading(true);

    try {

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      const user = userCredential.user;

      await setDoc(
        doc(db,"users",user.uid),
        {
          uid:user.uid,
          name,
          email,
          createdAt:new Date()
        }
      );

      navigate("/login");

    } catch(error){

      setError(error.message);

    } finally {

      setLoading(false);

    }

  };

  return (

    <div className="auth-container">

      <form
        className="auth-card"
        onSubmit={handleSignup}
      >

        <h2>Create Account 🚀</h2>

        <p className="auth-subtitle">
          Join PrintItUp today
        </p>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Full Name"
          required
          value={name}
          onChange={(e)=>
            setName(e.target.value)
          }
        />

        <input
          type="email"
          placeholder="Email Address"
          required
          value={email}
          onChange={(e)=>
            setEmail(e.target.value)
          }
        />

        <input
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={(e)=>
            setPassword(e.target.value)
          }
        />

        <input
          type="password"
          placeholder="Confirm Password"
          required
          value={confirmPassword}
          onChange={(e)=>
            setConfirmPassword(
              e.target.value
            )
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
          <Link to="/login">
            {" "}Login
          </Link>
        </p>

      </form>

    </div>

  );
}

export default Signup;