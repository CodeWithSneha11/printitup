import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import "../styles/Customize.css";
import TShirt3DPreview, { isWebGLAvailable } from "../components/TShirt3DPreview";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5mb

const tshirtColors = [
  { name: "white", code: "#ffffff" },
  { name: "black", code: "#111111" },
  { name: "red", code: "#ef4444" },
  { name: "navy", code: "#1e3a8a" },
  { name: "green", code: "#16a34a" },
  { name: "grey", code: "#9ca3af" },
];

const sizes = ["XS", "S", "M", "L", "XL", "XXL"];

const Customize = () => {
  const [text, setText] = useState("");
  const [position, setPosition] = useState("center");
  const [side, setSide] = useState("front");
  const [selectedColor, setSelectedColor] = useState("#ffffff");
  const [selectedSize, setSelectedSize] = useState("M");
  const [fontSize, setFontSize] = useState(18);
  const [textColor, setTextColor] = useState("#000000");
  const [neck, setNeck] = useState("round");
  const [rotate, setRotate] = useState(false);
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [message, setMessage] = useState("");

  // Separate loading states
  const [savingDesign, setSavingDesign] = useState(false);
  const [addingCart, setAddingCart] = useState(false);

  // Store uploaded Cloudinary URL
  const [cloudinaryUrl, setCloudinaryUrl] = useState("");

  // 3D / 2D preview toggle. Defaults to 3D only if the browser actually
  // supports WebGL — otherwise falls back to the CSS preview automatically.
  const [use3D, setUse3D] = useState(true);
  useEffect(() => {
    if (!isWebGLAvailable()) {
      setUse3D(false);
    }
  }, []);

  let finalPrice = 499;
  if (image) finalPrice += 100;
  if (side === "back") finalPrice += 50;
  if (selectedSize === "XL") finalPrice += 50;
  if (selectedSize === "XXL") finalPrice += 80;

  useEffect(() => {
    setRotate(true);
    const timer = setTimeout(() => setRotate(false), 600);
    return () => clearTimeout(timer);
  }, [side]);

  // Clean up object URL when image changes/unmounts to avoid memory leaks
  useEffect(() => {
    return () => {
      if (image) URL.revokeObjectURL(image);
    };
  }, [image]);

  const handleImageUpload = async (e) => {
    setCloudinaryUrl("");
    const file = e.target.files[0];

    if (!file) return;

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {

      setMessage("Only PNG, JPG, JPEG and WEBP images are allowed.");

      return;

    }

    if (file.size > MAX_FILE_SIZE) {

      setMessage("Maximum image size is 5MB.");

      return;

    }

    setMessage("");

    setImageFile(file);

    setImage(URL.createObjectURL(file));

    // Upload immediately in background

    try {

      await uploadImageToCloudinary(file);

    } catch (error) {

      console.log(error);

      setMessage("Image upload failed.");

    }

  };

  const removeImage = () => {

    if (image) {
      URL.revokeObjectURL(image);
    }

    setImage(null);
    setImageFile(null);

    // Remove uploaded URL also
    setCloudinaryUrl("");

  };

  const resetDesign = () => {

    if (image) {
      URL.revokeObjectURL(image);
    }

    setText("");
    setPosition("center");
    setSide("front");
    setSelectedColor("#ffffff");
    setSelectedSize("M");
    setFontSize(18);
    setTextColor("#000000");
    setNeck("round");

    setImage(null);
    setImageFile(null);

    setCloudinaryUrl("");

    setMessage("");

  };
  const uploadImageToCloudinary = async (file) => {

    if (!file) return "";

    setUploadingImage(true);
    setUploadProgress("Uploading image...");

    try {

      const formData = new FormData();

      formData.append("file", file);

      formData.append("upload_preset", "printitup");

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dfq3c3jkm/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message);
      }

      setCloudinaryUrl(data.secure_url);

      setUploadProgress("Image uploaded ✅");

      return data.secure_url;

    } catch (error) {

      setUploadProgress("Upload failed");

      throw error;

    } finally {

      setUploadingImage(false);

    }

  };
  const generateDesignId = async (design) => {

    const encoder = new TextEncoder();

    const data = encoder.encode(JSON.stringify(design));

    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      data
    );

    const hashArray = Array.from(new Uint8Array(hashBuffer));

    const hashHex = hashArray
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    // Return first 20 characters
    return hashHex.substring(0, 20);

  };
  const buildDesignData = async () => {

    const uid = localStorage.getItem("uid");

    if (!uid) {
      throw new Error("Please login first.");
    }

    let imageUrl = cloudinaryUrl;

    if (imageFile && !imageUrl) {

      imageUrl = await uploadImageToCloudinary(imageFile);

      setCloudinaryUrl(imageUrl);

    }

    const designId = await generateDesignId({

      text,

      position,

      side,

      tshirtColor: selectedColor,

      size: selectedSize,

      textColor,

      fontSize: Number(fontSize),

      neck,

      imageName: imageFile?.name || "",

      imageSize: imageFile?.size || 0,

      imageModified: imageFile?.lastModified || 0,

    });

    return {
      uid,
      designId,
      text,
      position,
      side,
      tshirtColor: selectedColor,
      size: selectedSize,
      textColor,
      fontSize: Number(fontSize),
      neck,
      imageUrl,
      price: finalPrice,
      createdAt: serverTimestamp(),
    };
  };
  const saveDesign = async () => {

    try {

      setSavingDesign(true);

      setMessage("");

      const designData = await buildDesignData();

      await addDoc(
        collection(db, "designs"),
        designData
      );

      setMessage("✅ Design Saved Successfully!");

    } catch (err) {

      console.log(err);

      setMessage(
        err.message || "❌ Unable to save design."
      );

    } finally {

      setSavingDesign(false);

    }

  };

  const addToCart = async () => {

    try {

      setAddingCart(true);

      setMessage("");

      const uid = localStorage.getItem("uid");

      if (!uid) {
        throw new Error("Please login first.");
      }

      const designData = await buildDesignData();
      console.log("Design ID:", designData.designId);
      console.log(designData);

      // Fetch all user's cart items
      const q = query(
        collection(db, "cart"),
        where("uid", "==", uid),
        where("designId", "==", designData.designId)
      );

      const snapshot = await getDocs(q);
      console.log("Matching docs:", snapshot.docs.length);

      snapshot.docs.forEach((d) => {
        console.log(d.id, d.data().designId);
      });

      // Find same design
      const existingDoc = snapshot.docs.find((docSnap) => {

        return docSnap.data().designId === designData.designId;

      });

      // Already exists
      if (existingDoc) {

        const existingData = existingDoc.data();

        await updateDoc(
          doc(db, "cart", existingDoc.id),
          {
            quantity: (existingData.quantity || 1) + 1,
          }
        );

        setMessage("🛒 Quantity Updated!");

        return;

      }

      // New Item
      await addDoc(
        collection(db, "cart"),
        {
          ...designData,
          quantity: 1,
        }
      );

      setMessage("✅ Added To Cart!");

    } catch (err) {

      console.log(err);

      setMessage(
        err.message || "Failed to add to cart."
      );

    } finally {

      setAddingCart(false);

    }

  };
  return (
    <div className="customize-container">
      {/* LEFT PANEL */}
      <div className="options">
        <h2>🎨 Customize Your T-Shirt</h2>

        <label>Custom Text</label>
        <input
          type="text"
          placeholder="Enter your text..."
          maxLength={30}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <small className="character-count">{text.length}/30 Characters</small>

        <label>Upload Image</label>
        <input type="file" accept="image/*" onChange={handleImageUpload} />

        {image && (
          <div className="uploaded-thumb-row">
            <img src={image} alt="Uploaded design" className="uploaded-thumb" />
            <button className="remove-image-btn" onClick={removeImage}>
              Remove Image
            </button>
          </div>
        )}

        {uploadingImage && (
          <small className="upload-status">{uploadProgress}</small>
        )}

        <label>Print Position</label>
        <select value={position} onChange={(e) => setPosition(e.target.value)}>
          <option value="center">Center</option>
          <option value="left">Left Chest</option>
          <option value="right">Right Chest</option>
        </select>

        <label>Print Side</label>
        <select value={side} onChange={(e) => setSide(e.target.value)}>
          <option value="front">Front</option>
          <option value="back">Back</option>
        </select>

        <label>T-Shirt Color</label>
        <div className="color-grid">
          {tshirtColors.map((color) => (
            <div
              key={color.name}
              className={`color-circle ${
                selectedColor === color.code ? "active-color" : ""
              }`}
              style={{ background: color.code }}
              onClick={() => setSelectedColor(color.code)}
              title={color.name}
            />
          ))}
        </div>

        <label>Size</label>
        <div className="size-grid">
          {sizes.map((size) => (
            <button
              key={size}
              type="button"
              className={
                selectedSize === size ? "size-btn active-size" : "size-btn"
              }
              onClick={() => setSelectedSize(size)}
            >
              {size}
            </button>
          ))}
        </div>

        <label>Text Color</label>
        <input
          type="color"
          value={textColor}
          onChange={(e) => setTextColor(e.target.value)}
        />

        <label>
          Font Size
          <span className="font-size">{fontSize}px</span>
        </label>
        <input
          type="range"
          min="12"
          max="36"
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
        />

        <label>Neck Style</label>
        <select value={neck} onChange={(e) => setNeck(e.target.value)}>
          <option value="round">Round</option>
          <option value="vneck">V-Neck</option>
          <option value="collar">Collar</option>
        </select>

        <div className="button-group">
          <button
            className="cart-btn"
            onClick={addToCart}
            disabled={addingCart || savingDesign}
          >
            {addingCart ? (
              <>
                <span className="spinner"></span>
                Adding...
              </>
            ) : (
              "🛒 Add to Cart"
            )}
          </button>
        </div>
        <div className="button-group">
          <button
            className="save-btn"
            onClick={saveDesign}
            disabled={savingDesign || addingCart}
          >
            {savingDesign ? (
              <>
                <span className="spinner"></span>
                Saving...
              </>
            ) : (
              " Save Design"
            )}
          </button>
          <button className="reset-btn" onClick={resetDesign}>
            Reset
          </button>
        </div>

        {message && <p className="save-message">{message}</p>}
      </div>

      {/* RIGHT PANEL */}
      <div className="preview">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
          <button
            type="button"
            className="reset-btn"
            style={{ padding: "4px 12px", fontSize: "13px" }}
            onClick={() => setUse3D((prev) => !prev)}
          >
            {use3D ? "Switch to 2D preview" : "Switch to 3D preview"}
          </button>
        </div>

        {use3D ? (
          <TShirt3DPreview
            color={selectedColor}
            text={text}
            textColor={textColor}
            fontSize={fontSize}
            imageUrl={image}
            side={side}
          />
        ) : (
          <div className={`preview-card ${rotate ? "rotate" : ""}`}>
            <div
              className={`tshirt-preview ${neck}`}
              style={{ background: selectedColor }}
            >
              <div className="neck"></div>
              <div className="stitch"></div>

              {image && (
                <img
                  src={image}
                  className={`logo-preview ${position}`}
                  alt="Logo"
                />
              )}

              {text && (
                <div
                  className={`text-preview ${position}`}
                  style={{
                    color: textColor,
                    fontSize: `${fontSize}px`,
                  }}
                >
                  {text}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PRICE DETAILS BELOW PREVIEW */}
        <div className="price-box preview-price">
          <h3>Price Details</h3>

          <div className="price-row">
            <span>Base Price</span>
            <span>₹499</span>
          </div>

          <div className="price-row">
            <span>Back Print</span>
            <span>{side === "back" ? "₹50" : "₹0"}</span>
          </div>

          <div className="price-row">
            <span>Logo Upload</span>
            <span>{image ? "₹100" : "₹0"}</span>
          </div>

          <div className="price-row">
            <span>Size</span>
            <span>{selectedSize}</span>
          </div>

          <hr />

          <h2>
            Total
            <span>₹{finalPrice}</span>
          </h2>
        </div>
      </div>
    </div>
  );
};

export default Customize;