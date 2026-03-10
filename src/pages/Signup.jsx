import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Auth.css";

function Signup() {

  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");

  const navigate = useNavigate();

  const handleSignup = async (e) => {

    e.preventDefault();

    try {

      const res = await fetch("http://localhost:5000/api/auth/signup",{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          name,
          email,
          password
        })
      });

      const data = await res.json();

      if(res.ok){
        alert("Signup Successful");
        navigate("/login");
      }else{
        alert(data.msg);
      }

    } catch (error) {

      console.log(error);
      alert("Server error");

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

        <button type="submit">Sign Up</button>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>

      </form>

    </div>

  );
}

export default Signup;