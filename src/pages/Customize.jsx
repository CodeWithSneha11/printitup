import React, { useState, useEffect } from "react";
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

  // Smooth rotation animation when side changes
  useEffect(() => {
    setRotate(true);
    const timer = setTimeout(() => setRotate(false), 600);
    return () => clearTimeout(timer);
  }, [side]);

  return (
    <div className="customize-container">
      {/* LEFT - Customization Panel */}
      <div className="options">
        <h2> 🎨  Customize Your T-Shirt</h2>

        <label>Enter Text:</label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Your text here..."
        />

        <label>Text Position:</label>
        <select value={position} onChange={(e) => setPosition(e.target.value)}>
          <option value="center">Center</option>
          <option value="left">Left Corner</option>
          <option value="right">Right Corner</option>
        </select>

        <label>Print Side:</label>
        <select value={side} onChange={(e) => setSide(e.target.value)}>
          <option value="front">Front</option>
          <option value="back">Back</option>
        </select>

        <label>T-Shirt Color:</label>
        <input
          type="color"
          value={tshirtColor}
          onChange={(e) => setTshirtColor(e.target.value)}
        />

        <label>Text Color:</label>
        <input
          type="color"
          value={textColor}
          onChange={(e) => setTextColor(e.target.value)}
        />

        <label>Font Size:</label>
        <input
          type="range"
          min="12"
          max="36"
          value={fontSize}
          onChange={(e) => setFontSize(e.target.value)}
        />
        <span>{fontSize}px</span>

        <label>Neck Style:</label>
        <select value={neck} onChange={(e) => setNeck(e.target.value)}>
          <option value="round">Round Neck</option>
          <option value="vneck">V-Neck</option>
          <option value="collar">Collar</option>
        </select>
      </div>

      {/* RIGHT - Preview Panel */}
      <div className="preview">
        <div
          className={`tshirt ${neck} ${rotate ? "rotate" : ""}`}
          style={{ backgroundColor: tshirtColor }}
        >
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
          Preview ({side === "front" ? "Front" : "Back"}, {neck})
        </p>
      </div>
    </div>
  );
};

export default Customize;
