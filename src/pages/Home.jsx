import React from "react";
import { Link } from "react-router-dom";
import "../styles/Home.css";

function Home() {
  return (
    <div className="home-container">

      {/* HERO SECTION */}

      <section className="hero-section">

        <div className="hero-text">

          <h1>
            Design Your <span>Own Style</span>
          </h1>

          <p>
            Create custom T-shirts with your own text, images and creativity.
            PrintItUp lets you design and wear what you imagine.
          </p>

          <Link to="/customize">
            <button className="hero-btn">
              Start Designing
            </button>
          </Link>

        </div>

        <div className="hero-image">
          <img
            src="https://i.imgur.com/6YVjD7Z.png"
            alt="Custom Tshirt"
          />
        </div>

      </section>

    </div>
  );
}

export default Home;