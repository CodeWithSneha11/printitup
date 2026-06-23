import React, { useState, useEffect } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import "../styles/Customize.css";

const Customize = () => {
  const [text, setText] = useState("");
  const [position, setPosition] = useState("center");
  const [side, setSide] = useState("front");
  const [tshirtColor, setTshirtColor] = useState("#ffffff");
  const [fontSize, setFontSize] = useState(18);
  const [neck, setNeck] = useState("round");
  const [rotate, setRotate] = useState(false);
  const [textColor, setTextColor] = useState("#000000");
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState("");

  const basePrice = 499;

  let finalPrice = basePrice;

  if (side === "back") finalPrice += 100;
  if (image) finalPrice += 50;

  useEffect(() => {
    setRotate(true);

    const timer = setTimeout(() => {
      setRotate(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [side]);

  const handleImageUpload = (e) => {
    if (e.target.files[0]) {
      setImage(URL.createObjectURL(e.target.files[0]));
    }
  };

  const removeImage = () => {
    setImage(null);
  };

  const saveDesign = async () => {
    try {
      const uid = localStorage.getItem("uid");

      if (!uid) {
        setMessage("Please login first");
        return;
      }

      await addDoc(collection(db, "designs"), {
        uid,
        text,
        position,
        side,
        tshirtColor,
        textColor,
        fontSize,
        neck,
        image: image || "",
        price: finalPrice,
        createdAt: new Date(),
      });

      setMessage("✅ Design saved successfully!");

    } catch (error) {
      console.log(error);
      setMessage("❌ Failed to save design");
    }
  };

  return (
    <div className="customize-container">

      {/* LEFT PANEL */}

      <div className="options">

        <h2>🎨 Customize Your T-Shirt</h2>

        <label>Enter Text</label>

        <input
          type="text"
          placeholder="Your text here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <label>Upload Logo / Image</label>

        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
        />

        {image && (
          <button
            className="remove-image-btn"
            onClick={removeImage}
          >
            Remove Image
          </button>
        )}

        <label>Text Position</label>

        <select
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        >
          <option value="center">Center</option>
          <option value="left">Left Corner</option>
          <option value="right">Right Corner</option>
        </select>

        <label>Print Side</label>

        <select
          value={side}
          onChange={(e) => setSide(e.target.value)}
        >
          <option value="front">Front</option>
          <option value="back">Back</option>
        </select>

        <label>T-Shirt Color</label>

        <input
          type="color"
          value={tshirtColor}
          onChange={(e) => setTshirtColor(e.target.value)}
        />

        <label>Text Color</label>

        <input
          type="color"
          value={textColor}
          onChange={(e) => setTextColor(e.target.value)}
        />

        <label>Font Size</label>

        <input
          type="range"
          min="12"
          max="36"
          value={fontSize}
          onChange={(e) => setFontSize(e.target.value)}
        />

        <span className="font-size-display">
          {fontSize}px
        </span>

        <label>Neck Style</label>

        <select
          value={neck}
          onChange={(e) => setNeck(e.target.value)}
        >
          <option value="round">Round Neck</option>
          <option value="vneck">V-Neck</option>
          <option value="collar">Collar</option>
        </select>

        <div className="price-box">
          <h3>Total Price</h3>
          <p>₹{finalPrice}</p>
        </div>

        <button
          className="save-btn"
          onClick={saveDesign}
        >
          💾 Save Design
        </button>

        {message && (
          <p className="save-message">
            {message}
          </p>
        )}

      </div>

      {/* RIGHT PANEL */}

      <div className="preview">

        <div
          className={`tshirt ${neck} ${rotate ? "rotate" : ""}`}
          style={{
            backgroundColor: tshirtColor,
          }}
        >

          {image && (
            <img
              src={image}
              alt="Design"
              className="design-image"
            />
          )}

          <span
            className={`tshirt-text ${side} ${position}`}
            style={{
              fontSize: `${fontSize}px`,
              color: textColor,
            }}
          >
            {text}
          </span>

        </div>

        <p className="preview-label">
          Preview ({side === "front" ? "Front" : "Back"})
        </p>

        <div className="design-summary">

          <h3>Design Summary</h3>

          <p>
            <strong>Text:</strong>{" "}
            {text || "No text added"}
          </p>

          <p>
            <strong>Neck:</strong> {neck}
          </p>

          <p>
            <strong>Side:</strong> {side}
          </p>

          <p>
            <strong>Image:</strong>{" "}
            {image ? "Uploaded" : "Not Added"}
          </p>

          <p>
            <strong>Price:</strong> ₹{finalPrice}
          </p>

        </div>

      </div>

    </div>
  );
};

export default Customize;