import React from "react";
import { Link } from "react-router-dom";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaEnvelope,
  FaPhoneAlt,
  FaMapMarkerAlt,
} from "react-icons/fa";

import "../styles/Footer.css";

const Footer = () => {
  return (
    <footer className="footer">

      <div className="footer-container">

        {/* Brand */}

        <div className="footer-section">

          <h2>PrintItUp</h2>

          <p>
            Design premium custom T-shirts with your own
            text, images and artwork. Fast printing,
            premium quality and delivery across India.
          </p>

        </div>

        {/* Quick Links */}

        <div className="footer-section">

          <h3>Quick Links</h3>

          <Link to="/">Home</Link>

          <Link to="/customize">Customize</Link>

          <Link to="/my-designs">My Designs</Link>

          <Link to="/cart">Cart</Link>

        </div>

        {/* Contact */}

        <div className="footer-section">

          <h3>Contact</h3>

          <p>
            <FaEnvelope /> support@printitup.com
          </p>

          <p>
            <FaPhoneAlt /> +91 1122334455
          </p>

          <p>
            <FaMapMarkerAlt /> Ahmedabad, Gujarat
          </p>

        </div>

        {/* Social */}

        <div className="footer-section">

          <h3>Follow Us</h3>

          <div className="footer-social">

            <a href="#">
              <FaFacebookF />
            </a>

            <a href="#">
              <FaInstagram />
            </a>

            <a href="#">
              <FaLinkedinIn />
            </a>

          </div>

        </div>

      </div>

      <div className="footer-bottom">

        © {new Date().getFullYear()} PrintItUp. All Rights Reserved.

      </div>

    </footer>
  );
};

export default Footer;