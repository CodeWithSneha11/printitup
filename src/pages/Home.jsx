import React from "react";
import { Link } from "react-router-dom";
import "../styles/Home.css";

function Home() {
  return (
    <div className="home-container">
      {/* Background Shapes */}

      <div className="blob blob1"></div>
      <div className="blob blob2"></div>

      {/* HERO */}

      <section className="hero-section">
        <div className="hero-text">
          <span className="hero-tag">✨ India's Smart T-Shirt Designer</span>

          <h1>
            Design Your
            <span> Dream T-Shirt</span>
          </h1>

          <p>
            Create premium custom T-shirts with your own text, logo and images.
            Design, preview and order in just a few clicks.
          </p>

          <div className="hero-buttons">
            <Link to="/customize">
              <button className="hero-btn">Start Designing</button>
            </Link>

           
          </div>

         
        </div>
      </section>

      {/* FEATURES */}

      <section className="features-section">
        <div className="feature-card">
          🎨
          <h3>Unlimited Designs</h3>
          <p>Create exactly what you imagine.</p>
        </div>

        <div className="feature-card">
          🚚
          <h3>Fast Delivery</h3>
          <p>Delivered across India.</p>
        </div>

        <div className="feature-card">
          🧵
          <h3>Premium Cotton</h3>
          <p>Soft, comfortable and durable.</p>
        </div>

        <div className="feature-card">
          🖨️
          <h3>HD Printing</h3>
          <p>Bright colors with long-lasting quality.</p>
        </div>
      </section>

     
    </div>
  );
}

export default Home;
