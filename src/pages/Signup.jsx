import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import {
  createUserWithEmailAndPassword
} from "firebase/auth";

import {
  doc,
  setDoc
} from "firebase/firestore";

import { auth, db } from "../firebase";

import "../styles/Auth.css";

function Signup() {

  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");

  const navigate = useNavigate();

  const handleSignup = async (e) => {

    e.preventDefault();

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
          name:name,
          email:email,
          createdAt:new Date()
        }
      );

      alert("Signup Successful");

      navigate("/login");

    } catch(error) {

      alert(error.message);

    }

  };

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleSignup}>

        <h2>Create Account</h2>

        <input
          type="text"
          placeholder="Full Name"
          required
          onChange={(e)=>setName(e.target.value)}
        />

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
          Sign Up
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