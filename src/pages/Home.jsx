import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Home.css";

function Home() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token"); // check if user is logged in

  const handleStartDesigning = () => {
    if (token) {
      navigate("/customize"); // go to customize if logged in
    } else {
      navigate("/login"); // go to login if not logged in
    }
  };

  return (
    <div className="home-container">
      <section className="hero-section">
        <div className="hero-content">
          <h1>Design. Print. Wear. Express.</h1>
          <p>Bring your ideas to life with custom T-shirts that speak your style.</p>
          <button className="cta-btn" onClick={handleStartDesigning}>
            Start Designing
          </button>
        </div>
        <div className="hero-image">
          <img src="https://i.imgur.com/6YVjD7Z.png" alt="Custom T-Shirt" />
        </div>
      </section>

      <section className="features-section">
        <h2>Why Choose PrintItUp?</h2>
        <div className="features">
          <div className="feature">
            <img src="https://cdn-icons-png.flaticon.com/512/1041/1041916.png" alt="Customization" />
            <h3>Full Customization</h3>
            <p>Design T-shirts with your text, images, and colors.</p>
          </div>
          <div className="feature">
            <img src="https://cdn-icons-png.flaticon.com/512/1161/1161388.png" alt="Quality" />
            <h3>Premium Quality</h3>
            <p>We use high-quality fabric and durable printing methods.</p>
          </div>
          <div className="feature">
            <img src="https://cdn-icons-png.flaticon.com/512/992/992700.png" alt="Delivery" />
            <h3>Fast Delivery</h3>
            <p>Get your custom T-shirts delivered to your doorstep fast.</p>
          </div>
        </div>
      </section>

      <footer>
        <p>© 2025 PrintItUp. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default Home;
