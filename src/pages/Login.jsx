import { useState } from "react";
import { Link,useNavigate } from "react-router-dom";

import {
  signInWithEmailAndPassword
} from "firebase/auth";

import { auth } from "../firebase";

import "../styles/Auth.css";

function Login() {

  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {

    e.preventDefault();

    try {

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      localStorage.setItem(
        "uid",
        userCredential.user.uid
      );

      alert("Login Successful");

      navigate("/");

    } catch(error) {

      alert(error.message);

    }

  };

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleLogin}>

        <h2>Login</h2>

        <input
          type="email"
          placeholder="Email"
          required
          onChange={(e)=>setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          required
          onChange={(e)=>setPassword(e.target.value)}
        />

        <button type="submit">
          Login
        </button>

        <p className="auth-switch">
          Don't have an account?
          <Link to="/signup"> Signup</Link>
        </p>

      </form>
    </div>
  );
}

export default Login;