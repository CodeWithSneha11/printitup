import React from "react";
import { Link } from "react-router-dom";
import {
  FaPaintBrush,
  FaTruck,
  FaTshirt,
  FaPrint,
  FaArrowRight,
  FaStar,
} from "react-icons/fa";

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

          <span className="hero-tag">
            <FaStar className="tag-icon" />
            India's Smart T-Shirt Designer
          </span>

          <h1>
            Design Your
            <span> Dream T-Shirt</span>
          </h1>

          <p>
            Create premium custom T-shirts with your own text,
            logo and images. Design, preview and order in just
            a few clicks.
          </p>

          <div className="hero-buttons">

            <Link to="/customize">

              <button className="hero-btn">

                Start Designing

                <FaArrowRight />

              </button>

            </Link>

          </div>

        </div>

      </section>

      {/* FEATURES */}

      <section className="features-section">

        <div className="feature-card">

          <div className="feature-icon">
            <FaPaintBrush />
          </div>

          <h3>Unlimited Designs</h3>

          <p>
            Create exactly what you imagine with complete
            customization.
          </p>

        </div>

        <div className="feature-card">

          <div className="feature-icon">
            <FaTruck />
          </div>

          <h3>Fast Delivery</h3>

          <p>
            Quick and secure delivery across India.
          </p>

        </div>

        <div className="feature-card">

          <div className="feature-icon">
            <FaTshirt />
          </div>

          <h3>Premium Cotton</h3>

          <p>
            Soft, comfortable and durable fabric for everyday
            wear.
          </p>

        </div>

        <div className="feature-card">

          <div className="feature-icon">
            <FaPrint />
          </div>

          <h3>HD Printing</h3>

          <p>
            High-quality prints with vibrant colors that last.
          </p>

        </div>

      </section>

    </div>
  );
}

export default Home;