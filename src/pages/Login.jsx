import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Auth.css";

function Login() {

  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {

    e.preventDefault();

    try{

      const res = await fetch("http://localhost:5000/api/auth/login",{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await res.json();

      if(res.ok){

        localStorage.setItem("token",data.token);

        alert("Login successful");

        navigate("/");

      }else{

        alert(data.msg);

      }

    }catch(err){

      console.log(err);
      alert("Server error");

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
          Don't have an account? <Link to="/signup">Signup</Link>
        </p>

      </form>

    </div>

  );

}

export default Login;