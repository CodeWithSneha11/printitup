import React, { useState, useEffect } from "react";

// Firebase Firestore
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";

import "../styles/Customize.css";

const Customize = () => {
  // State variables for customization options
  const [text, setText] = useState("");
  const [position, setPosition] = useState("center");
  const [side, setSide] = useState("front");
  const [tshirtColor, setTshirtColor] = useState("#ffffff");
  const [fontSize, setFontSize] = useState(18);
  const [neck, setNeck] = useState("round");
  const [rotate, setRotate] = useState(false);
  const [textColor, setTextColor] = useState("#000000");

  // State for uploaded image
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  // State for status messages and loading
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Base price of the T-shirt
  const basePrice = 499;

  // Calculate final price based on selected options
  let finalPrice = basePrice;

  if (side === "back") finalPrice += 50;
  if (image) finalPrice += 100;

  // Rotate animation whenever the user switches sides
  useEffect(() => {
    setRotate(true);

    const timer = setTimeout(() => {
      setRotate(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [side]);

  // Handles image selection from user's device
  const handleImageUpload = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setImageFile(file);

    // Create a temporary preview URL
    setImage(URL.createObjectURL(file));
  };

  // Removes the uploaded image
  const removeImage = () => {
    setImage(null);
    setImageFile(null);
  };

  // Uploads the selected image to Cloudinary
  const uploadImageToCloudinary = async () => {
    if (!imageFile) return "";

    const formData = new FormData();

    formData.append("file", imageFile);
    formData.append("upload_preset", "printitup");

    const response = await fetch(
      "https://api.cloudinary.com/v1_1/dfq3c3jkm/image/upload",
      {
        method: "POST",
        body: formData,
      },
    );

    const data = await response.json();

    console.log("Cloudinary Response:", data);

    if (!response.ok) {
      throw new Error(data.error?.message || "Upload failed");
    }

    // Return uploaded image URL
    return data.secure_url;
  };

  // Saves the customized design to Firestore
  const saveDesign = async () => {
    try {
      setLoading(true);

      // Get logged-in user's UID
      const uid = localStorage.getItem("uid");

      if (!uid) {
        setMessage("Please login first");

        return;
      }

      let imageUrl = "";

      // Upload image if available
      if (imageFile) {
        imageUrl = await uploadImageToCloudinary();
      }

      // Store design details in Firestore
      await addDoc(collection(db, "designs"), {
        uid,
        text,
        position,
        side,
        tshirtColor,
        textColor,
        fontSize,
        neck,
        imageUrl,
        price: finalPrice,
        createdAt: new Date(),
      });

      setMessage("✅ Design saved successfully");
    } catch (error) {
      console.log(error);

      setMessage("❌ Failed to save design");
    } finally {
      // Stop loading after saving
      setLoading(false);
    }
  };

  return (
    <div className="customize-container">
      {/* Customization Options Panel */}
      <div className="options">
        <h2>🎨 Customize Your T-Shirt</h2>

        {/* Text Input */}
        <label>Enter Text</label>

        <input
          type="text"
          placeholder="Your text here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {/* Image Upload */}
        <label>Upload Logo / Image</label>

        <input type="file" accept="image/*" onChange={handleImageUpload} />

        {/* Remove uploaded image */}
        {image && (
          <button className="remove-image-btn" onClick={removeImage}>
            Remove Image
          </button>
        )}

        {/* Text Position Selection */}
        <label>Text Position</label>

        <select value={position} onChange={(e) => setPosition(e.target.value)}>
          <option value="center">Center</option>

          <option value="left">Left Corner</option>

          <option value="right">Right Corner</option>
        </select>

        {/* Print Side Selection */}
        <label>Print Side</label>

        <select value={side} onChange={(e) => setSide(e.target.value)}>
          <option value="front">Front</option>

          <option value="back">Back</option>
        </select>

        {/* T-Shirt Color Picker */}
        <label>T-Shirt Color</label>

        <input
          type="color"
          value={tshirtColor}
          onChange={(e) => setTshirtColor(e.target.value)}
        />

        {/* Text Color Picker */}
        <label>Text Color</label>

        <input
          type="color"
          value={textColor}
          onChange={(e) => setTextColor(e.target.value)}
        />

        {/* Font Size Slider */}
        <label>Font Size</label>

        <input
          type="range"
          min="12"
          max="36"
          value={fontSize}
          onChange={(e) => setFontSize(e.target.value)}
        />

        <span>{fontSize}px</span>

        {/* Neck Style Selection */}
        <label>Neck Style</label>

        <select value={neck} onChange={(e) => setNeck(e.target.value)}>
          <option value="round">Round Neck</option>

          <option value="vneck">V-Neck</option>

          <option value="collar">Collar</option>
        </select>

        {/* Display calculated price */}
        <div className="price-box">
          <h3>Total Price</h3>

          <p>₹{finalPrice}</p>
        </div>

        {/* Save Design Button */}
        <button className="save-btn" onClick={saveDesign} disabled={loading}>
          {loading ? "Saving..." : "💾 Save Design"}
        </button>

        {/* Save status message */}
        {message && <p className="save-message">{message}</p>}
      </div>

      {/* Live Preview Section */}
      <div className="preview">
        <div
          className={`tshirt ${neck} ${rotate ? "rotate" : ""}`}
          style={{
            backgroundColor: tshirtColor,
          }}
        >
          {/* Display uploaded image */}
          {image && <img src={image} alt="Design" className="design-image" />}

          {/* Display customized text */}
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

        {/* Preview Label */}
        <p className="preview-label">
          Preview ({side === "front" ? "Front" : "Back"})
        </p>

        {/* Design Summary */}
        <div className="design-summary">
          <h3>Design Summary</h3>

          <p>
            <strong>Text:</strong> {text || "No text"}
          </p>

          <p>
            <strong>Neck:</strong> {neck}
          </p>

          <p>
            <strong>Side:</strong> {side}
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
