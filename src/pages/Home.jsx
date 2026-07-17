
import { Link } from "react-router-dom";
import React, { useState } from "react";
import HomeShirt from "./HomeShirt";

import {
  FaArrowRight,

  FaStar,
  FaPalette,
  FaMagic,
  FaTshirt,
} from "react-icons/fa";

import "../styles/Home.css";
import "../styles/HomeColorPicker.css";

// Local category images 
import oversizedImg from "../assets/images/categories/oversized.svg";
import poloImg from "../assets/images/categories/polo.svg";
import roundNeckImg from "../assets/images/categories/round-neck.svg";


function Home() {
  const colors = [
    "#000000",
    "#ffffff",
    "#2563eb",
    "#ef4444",
    "#16a34a",
    "#f59e0b",
    "#7c3aed",
    "#ec4899",
  ];
const [shirtColor, setShirtColor] = useState("#ffffff");
  const categories = [
    {
      title: "Oversized",
      image: oversizedImg,
    },
    {
      title: "Polo",
      image: poloImg,
    },
    {
      title: "Round Neck",
      image: roundNeckImg,
    },
    
  ];

  return (
    <div className="home-container">
      {/* Animated Background */}

      <div className="blob blob1"></div>
      <div className="blob blob2"></div>
      <div className="blob blob3"></div>

      <div className="grid-bg"></div>

      {/* Floating Circles */}

      <div className="floating-circle c1"></div>
      <div className="floating-circle c2"></div>
      <div className="floating-circle c3"></div>

      {/* ========================= HERO ======================== */}

      <section className="hero-section">

        {/* LEFT */}

        <div className="hero-left">

          <span className="hero-tag">
            <FaStar />
            India's Premium Custom Printing Platform
          </span>

          <h1>
            Create Your
            <span> Perfect T-Shirt </span>
            In Minutes
          </h1>

          <p>
            Design premium quality custom t-shirts with your own
            text, logos, artwork and images.
            Preview your design instantly before ordering.
          </p>

          <div className="hero-buttons">

            <Link to="/customize">

              <button className="primary-btn">
                Start Designing
                <FaArrowRight />
              </button>

            </Link>

          </div>

          {/* Stats */}

          <div className="hero-stats">

          </div>

        </div>

        {/* RIGHT */}

        <div className="hero-right">

          <div className="shirt-card">

            <div className="discount-badge">
              NEW
            </div>

     <HomeShirt color={shirtColor} />
     

            <div className="floating-mini-card top">
              <FaPalette />
              Colors
            </div>

            <div className="floating-mini-card bottom">
              <FaMagic />
              HD Printing
            </div>

          </div>

        </div>

      </section>

      {/* ================= COLORS ================= */}

      <section className="colors-section">

        <h2>
          Choose Your Favorite Color
        </h2>

        <p>
          Available in multiple premium shades.
        </p>

        <div className="color-list">

          {colors.map((color, index) => (
 <div
  key={index}
  className={`color-circle ${
    shirtColor === color ? "active" : ""
  }`}
  style={{
    background: color,
  }}
  onClick={() => setShirtColor(color)}
></div>
          ))}

        </div>

      </section>

      {/* ================= CATEGORIES ================= */}

      <section className="category-section">

        <div className="section-title">

          <h2>
            Popular Collections
          </h2>

          <p>
            Find your perfect style.
          </p>

        </div>

        <div className="category-grid">

          {categories.map((item, index) => (

            <div className="category-card" key={index}>

              <img
                src={item.image}
                alt={item.title}
              />

              <div className="category-overlay">

                <h3>{item.title}</h3>

                <Link to="/customize">

                  <button>
                    Customize
                  </button>

                </Link>

              </div>

            </div>

          ))}

        </div>

      </section>

      <section className="design-process">

        <div className="section-title">

          <h2>
            Design In 3 Easy Steps
          </h2>

          <p>
            Your personalized t-shirt is just minutes away.
          </p>

        </div>

        <div className="process-grid">

          <div className="process-card">

            <div className="step-number">
              1
            </div>

            <FaTshirt className="process-icon" />

            <h3>Select T-Shirt</h3>

            <p>
              Choose from premium cotton.
            </p>

          </div>

          <div className="process-card">

            <div className="step-number">
              2
            </div>

            <FaPalette className="process-icon" />

            <h3>Customize</h3>

            <p>
              Upload images, add text,
              choose fonts and colors.
            </p>

          </div>

          <div className="process-card">

            <div className="step-number">
              3
            </div>

            <FaMagic className="process-icon" />

            <h3>Preview & Order</h3>

            <p>
              See a live preview and
              place your order instantly.
            </p>

          </div>

        </div>

      </section>

    </div>
  );
}

export default Home;