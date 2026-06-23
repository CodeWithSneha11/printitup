import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import "../styles/Auth.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

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

      navigate("/");
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">

      <form className="auth-card" onSubmit={handleLogin}>

        <h2>Welcome Back 👋</h2>

        <p className="auth-subtitle">
          Login to continue designing
        </p>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder="Email Address"
          required
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
        />

        <div className="password-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            required
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
          />

          <span
            className="toggle-password"
            onClick={() =>
              setShowPassword(!showPassword)
            }
          >
            {showPassword ? "🙈" : "👁"}
          </span>
        </div>

        <button
          type="submit"
          disabled={loading}
        >
          {loading ? "Logging In..." : "Login"}
        </button>

        <p className="auth-switch">
          Don't have an account?
          <Link to="/signup">
            {" "}Sign Up
          </Link>
        </p>

      </form>

    </div>
  );
}

export default Login;