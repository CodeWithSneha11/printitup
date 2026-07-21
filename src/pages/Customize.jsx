import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { db } from "../firebase";
import "../styles/Customize.css";
import TShirt3DPreview, {
  isWebGLAvailable,
} from "../components/TShirt3DPreview";
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
import {
  FaImage,
  FaRulerCombined,
  FaTshirt,
  FaFont,
  FaCheck,
  FaCube,
  FaSquare,
  FaTimes,
  FaCrosshairs,
  FaMinus,
  FaPlus,
} from "react-icons/fa";
import { Rnd } from "react-rnd";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_QUANTITY = 10;
const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const tshirtColors = [
  { name: "White", code: "#ffffff" },
  { name: "Black", code: "#111111" },
  { name: "Red", code: "#ef4444" },
  { name: "Navy", code: "#1e3a8a" },
  { name: "Green", code: "#16a34a" },
  { name: "Grey", code: "#9ca3af" },
];

const sizes = ["XS", "S", "M", "L", "XL", "XXL"];

const Customize = () => {
  const location = useLocation();

  // Product passed in from the Collections page, if the user arrived
  // via "Customize this product" rather than a direct visit.
  const incomingProduct = location.state?.product || null;
  const fromCollection = location.state?.fromCollection || false;
  const [selectedProduct, setSelectedProduct] = useState(incomingProduct);

  // Existing design passed in for editing, if the user arrived via
  // "Edit design" from My Designs.
  const incomingDesign = location.state?.design || null;
  const editMode = location.state?.editMode || false;
  const designDocId = incomingDesign?.id || null;

  const [text, setText] = useState("");
  const [side, setSide] = useState("front");
  const [selectedColor, setSelectedColor] = useState("#ffffff");
  const [selectedSize, setSelectedSize] = useState("M");
  const [fontSize, setFontSize] = useState(18);
  const [textColor, setTextColor] = useState("#000000");
  const [neck, setNeck] = useState("round");
  const [rotate, setRotate] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [message, setMessage] = useState("");

  // Save and cart actions have independent loading states so one
  // doesn't block the other's button from showing its own spinner.
  const [savingDesign, setSavingDesign] = useState(false);
  const [addingCart, setAddingCart] = useState(false);

  const [cloudinaryUrl, setCloudinaryUrl] = useState("");

  const [use3D, setUse3D] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);

  const [imagePosition, setImagePosition] = useState({ x: 100, y: 80 });
  const [imageSize, setImageSize] = useState({ width: 100, height: 100 });
  const [textPosition, setTextPosition] = useState({ x: 90, y: 220 });
  const [textSize, setTextSize] = useState({ width: 150, height: 50 });

  // Reference to the rendered shirt canvas, used to measure available
  // space when centering an element.
  const canvasRef = useRef(null);

  const hasDesignContent = Boolean(text.trim() || image);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setUse3D(false);
    }
  }, []);

  // Pre-fill fields from the product passed via the Collections page.
  // Runs once on mount and only overrides fields the product actually
  // specifies, so a direct visit to /customize is unaffected.
  useEffect(() => {
    if (!incomingProduct) return;

    if (incomingProduct.color) setSelectedColor(incomingProduct.color);
    if (incomingProduct.size) setSelectedSize(incomingProduct.size);
    if (incomingProduct.neck) setNeck(incomingProduct.neck);

    // The product image is a remote URL, not a blob, so it's never
    // passed to URL.revokeObjectURL in the cleanup effect below.
    if (incomingProduct.image) {
      setImage(incomingProduct.image);
      setCloudinaryUrl(incomingProduct.image);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore a previously saved design when arriving in edit mode.
  useEffect(() => {
    if (!editMode || !incomingDesign) return;

    setText(incomingDesign.text || "");
    setSide(incomingDesign.side || "front");
    setSelectedColor(incomingDesign.tshirtColor || "#ffffff");
    setSelectedSize(incomingDesign.size || "M");
    setTextColor(incomingDesign.textColor || "#000000");
    setFontSize(Number(incomingDesign.fontSize) || 18);
    setNeck(incomingDesign.neck || "round");

    if (incomingDesign.imageUrl) {
      setImage(incomingDesign.imageUrl);
      setCloudinaryUrl(incomingDesign.imageUrl);
    }

    if (incomingDesign.imagePosition)
      setImagePosition(incomingDesign.imagePosition);
    if (incomingDesign.imageSize) setImageSize(incomingDesign.imageSize);
    if (incomingDesign.textPosition)
      setTextPosition(incomingDesign.textPosition);
    if (incomingDesign.textSize) setTextSize(incomingDesign.textSize);
  }, [editMode, incomingDesign]);

  let finalPrice = 499;
  if (image) finalPrice += 100;
  if (side === "back") finalPrice += 50;
  if (selectedSize === "XL") finalPrice += 50;
  if (selectedSize === "XXL") finalPrice += 80;

  const orderTotal = finalPrice * quantity;

  // Brief flip animation whenever the print side is toggled.
  useEffect(() => {
    setRotate(true);
    const timer = setTimeout(() => setRotate(false), 600);
    return () => clearTimeout(timer);
  }, [side]);

  // Revoke object URLs we created ourselves to avoid leaking memory.
  // A remote (http/https) product or saved-design image must never
  // be revoked, since we don't own that URL.
  useEffect(() => {
    return () => {
      if (image && image.startsWith("blob:")) URL.revokeObjectURL(image);
    };
  }, [image]);

  // Keyboard shortcuts for the selected canvas element:
  // Delete/Backspace removes it, Escape deselects it, and the arrow
  // keys nudge its position (hold Shift to move in larger steps).
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedElement(null);
        return;
      }

      if (!selectedElement) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedElement === "image") removeImage();
        if (selectedElement === "text") setText("");
        setSelectedElement(null);
        return;
      }

      const arrowDeltas = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };

      if (arrowDeltas[e.key]) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const [dx, dy] = arrowDeltas[e.key];
        const offset = { x: dx * step, y: dy * step };

        if (selectedElement === "image") {
          setImagePosition((prev) => ({
            x: prev.x + offset.x,
            y: prev.y + offset.y,
          }));
        } else {
          setTextPosition((prev) => ({
            x: prev.x + offset.x,
            y: prev.y + offset.y,
          }));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElement, image]);

  // Shared validation + upload path for a chosen image, used by both
  // the file input and the drag-and-drop dropzone.
  const processImageFile = async (file) => {
    if (!file) return;

    setCloudinaryUrl("");

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setMessage("❌ Only PNG, JPG, JPEG and WEBP images are allowed.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setMessage("❌ Maximum image size is 5MB.");
      return;
    }

    setMessage("");
    setImageFile(file);
    setImage(URL.createObjectURL(file));
    setSelectedElement("image");

    try {
      await uploadImageToCloudinary(file);
    } catch (error) {
      console.error("Image upload failed:", error);
      setMessage("❌ Image upload failed.");
    }
  };

  const handleImageUpload = (e) => processImageFile(e.target.files[0]);

  const handleDropzoneDragOver = (e) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDropzoneDragLeave = () => setIsDraggingFile(false);

  const handleDropzoneDrop = (e) => {
    e.preventDefault();
    setIsDraggingFile(false);
    processImageFile(e.dataTransfer.files?.[0]);
  };

  const removeImage = () => {
    if (image && image.startsWith("blob:")) {
      URL.revokeObjectURL(image);
    }
    setImage(null);
    setImageFile(null);
    setCloudinaryUrl("");
  };

  const resetDesign = () => {
    if (
      hasDesignContent &&
      !window.confirm("Discard your current design? This can't be undone.")
    ) {
      return;
    }

    if (image && image.startsWith("blob:")) {
      URL.revokeObjectURL(image);
    }

    setText("");
    setSide("front");
    setSelectedColor("#ffffff");
    setSelectedSize("M");
    setFontSize(18);
    setTextColor("#000000");
    setNeck("round");
    setQuantity(1);

    setImage(null);
    setImageFile(null);
    setCloudinaryUrl("");
    setMessage("");
    setSelectedElement(null);

    // Clears the product association too, since the design no longer
    // reflects the product that was originally passed in.
    setSelectedProduct(null);
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
        { method: "POST", body: formData },
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

  // Deterministic ID for a design's current configuration, used to
  // detect duplicate cart entries so we can bump quantity instead of
  // inserting a second row for the same design.
  const generateDesignId = async (design) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(design));
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .substring(0, 20);
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
      side,
      tshirtColor: selectedColor,
      size: selectedSize,
      textColor,
      fontSize: Number(fontSize),
      neck,
      imageName: imageFile?.name || "",
      imageFileSize: imageFile?.size || 0,
      imageModified: imageFile?.lastModified || 0,
      imagePosition,
      imageSize,
      textPosition,
      textSize,
      productId: selectedProduct?.id || "",
    });

    return {
      uid,
      designId,
      productId: selectedProduct?.id || null,
      productName: selectedProduct?.name || null,
      text,
      side,
      tshirtColor: selectedColor,
      size: selectedSize,
      textColor,
      fontSize: Number(fontSize),
      neck,
      imageUrl,
      imagePosition,
      imageSize,
      textPosition,
      textSize,
      price: finalPrice,
      createdAt: serverTimestamp(),
    };
  };

  const saveDesign = async () => {
    if (!hasDesignContent) {
      setMessage("❌ Add some text or an image before saving.");
      return;
    }

    try {
      setSavingDesign(true);
      setMessage("");

      const designData = await buildDesignData();

      if (editMode && designDocId) {
        await updateDoc(doc(db, "designs", designDocId), designData);
        setMessage("✅ Design updated successfully!");
      } else {
        await addDoc(collection(db, "designs"), designData);
        setMessage("✅ Design saved successfully!");
      }
    } catch (err) {
      console.error("Save design failed:", err);
      setMessage("❌ " + (err.message || "Unable to save design."));
    } finally {
      setSavingDesign(false);
    }
  };

  const addToCart = async () => {
    if (!hasDesignContent) {
      setMessage("❌ Add some text or an image before adding to cart.");
      return;
    }

    try {
      setAddingCart(true);
      setMessage("");

      const uid = localStorage.getItem("uid");

      if (!uid) {
        throw new Error("Please login first.");
      }

      const designData = await buildDesignData();

      const q = query(
        collection(db, "cart"),
        where("uid", "==", uid),
        where("designId", "==", designData.designId),
      );

      const snapshot = await getDocs(q);
      const existingDoc = snapshot.docs.find(
        (docSnap) => docSnap.data().designId === designData.designId,
      );

      if (existingDoc) {
        const existingData = existingDoc.data();

        await updateDoc(doc(db, "cart", existingDoc.id), {
          quantity: (existingData.quantity || 1) + quantity,
        });

        setMessage("🛒 Quantity updated in cart!");
        return;
      }

      await addDoc(collection(db, "cart"), {
        ...designData,
        quantity,
      });

      setMessage("✅ Added to cart!");
    } catch (err) {
      console.error("Add to cart failed:", err);
      setMessage("❌ " + (err.message || "Failed to add to cart."));
    } finally {
      setAddingCart(false);
    }
  };

  // Clicking empty shirt space deselects whatever's currently selected.
  const handleCanvasBackgroundClick = () => setSelectedElement(null);

  // Snaps an element to horizontal center — the practical replacement
  // for the old center/left/right presets now that placement is freeform.
  const centerElement = (type) => {
    if (!canvasRef.current) return;
    const { width } = canvasRef.current.getBoundingClientRect();

    if (type === "image") {
      setImagePosition((prev) => ({
        ...prev,
        x: Math.max(0, (width - imageSize.width) / 2),
      }));
    } else {
      setTextPosition((prev) => ({
        ...prev,
        x: Math.max(0, (width - textSize.width) / 2),
      }));
    }
  };

  const isError = message.startsWith("❌");

  return (
    <div className="customize-container">
      {/* LEFT PANEL */}
      <div className="options">
        <div className="options-header">
          <h2>Customize Your T-Shirt</h2>
          <p className="options-subtitle">
            {fromCollection && selectedProduct
              ? `Customizing: ${selectedProduct.name}`
              : "Build your design in a few simple steps"}
          </p>
        </div>

        {/* SECTION 1 — DESIGN */}
        <div className="option-section">
          <div className="section-heading">
            <FaImage className="section-icon" />
            <h3>Your Design</h3>
          </div>

          <label htmlFor="custom-text">Custom Text</label>
          <input
            id="custom-text"
            type="text"
            placeholder="Enter your text..."
            maxLength={50}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => text && setSelectedElement("text")}
          />
          <small className="character-count">{text.length}/50 characters</small>

          <label htmlFor="image-upload">Upload Image</label>
          <div
            className={`file-upload-wrap${isDraggingFile ? " dragging" : ""}`}
            onDragOver={handleDropzoneDragOver}
            onDragLeave={handleDropzoneDragLeave}
            onDrop={handleDropzoneDrop}
          >
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>

          {image && (
            <div className="uploaded-thumb-row">
              <img
                src={image}
                alt="Uploaded design"
                className="uploaded-thumb"
              />
              <div className="uploaded-thumb-info">
                <span>Image added</span>
                <button className="remove-image-btn" onClick={removeImage}>
                  <FaTimes /> Remove
                </button>
              </div>
            </div>
          )}

          {uploadingImage && (
            <small className="upload-status">{uploadProgress}</small>
          )}
        </div>

        {/* SECTION 2 — PLACEMENT */}
        <div className="option-section">
          <div className="section-heading">
            <FaRulerCombined className="section-icon" />
            <h3>Placement</h3>
          </div>
          <label htmlFor="print-side">Print Side</label>
          <select
            id="print-side"
            value={side}
            onChange={(e) => setSide(e.target.value)}
          >
            <option value="front">Front</option>
            <option value="back">Back</option>
          </select>
        </div>

        {/* SECTION 3 — STYLE */}
        <div className="option-section">
          <div className="section-heading">
            <FaTshirt className="section-icon" />
            <h3>T-Shirt Style</h3>
          </div>

          <label>T-Shirt Color</label>
          <div className="color-grid">
            {tshirtColors.map((color) => (
              <div key={color.name} className="color-item">
                <div
                  className={`color-circle ${
                    selectedColor === color.code ? "active-color" : ""
                  }`}
                  style={{ background: color.code }}
                  onClick={() => setSelectedColor(color.code)}
                  title={color.name}
                >
                  {selectedColor === color.code && (
                    <FaCheck
                      className="color-check"
                      style={{
                        color: color.code === "#ffffff" ? "#111827" : "#ffffff",
                      }}
                    />
                  )}
                </div>
                <span className="color-label">{color.name}</span>
              </div>
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

          <label htmlFor="neck-style">Neck Style</label>
          <select
            id="neck-style"
            value={neck}
            onChange={(e) => setNeck(e.target.value)}
          >
            <option value="round">Round</option>
            <option value="vneck">V-Neck</option>
            <option value="collar">Collar</option>
          </select>

          <label>Quantity</label>
          <div className="quantity-stepper">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
            >
              <FaMinus />
            </button>
            <span className="quantity-value">{quantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
              disabled={quantity >= MAX_QUANTITY}
            >
              <FaPlus />
            </button>
          </div>
        </div>

        {/* SECTION 4 — TEXT STYLING */}
        <div className="option-section">
          <div className="section-heading">
            <FaFont className="section-icon" />
            <h3>Text Styling</h3>
          </div>

          <div className="text-style-row">
            <div>
              <label htmlFor="text-color">Text Color</label>
              <input
                id="text-color"
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
              />
            </div>

            <div className="font-size-control">
              <label htmlFor="font-size">
                Font Size
                <span className="font-size">{fontSize}px</span>
              </label>
              <input
                id="font-size"
                type="range"
                min="12"
                max="36"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

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
              "Save Design"
            )}
          </button>
          <button className="reset-btn" onClick={resetDesign}>
            Reset
          </button>
        </div>

        {message && (
          <p className={`save-message ${isError ? "error" : "success"}`}>
            {message}
          </p>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className="preview">
        <div className="view-toggle">
          <button
            type="button"
            className={use3D ? "toggle-btn active" : "toggle-btn"}
            onClick={() => setUse3D(true)}
          >
            <FaCube /> 3D View
          </button>
          <button
            type="button"
            className={!use3D ? "toggle-btn active" : "toggle-btn"}
            onClick={() => setUse3D(false)}
          >
            <FaSquare /> 2D View
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
            imagePosition={imagePosition}
            imageSize={imageSize}
            textPosition={textPosition}
            textSize={textSize}
          />
        ) : (
          <>
            <div className={`preview-card ${rotate ? "rotate" : ""}`}>
              <div
                className={`tshirt-preview ${neck}`}
                style={{ background: selectedColor }}
                ref={canvasRef}
                onClick={handleCanvasBackgroundClick}
              >
                <div className="fabric-shade"></div>
                <div className="neck"></div>
                <div className="stitch"></div>

                {selectedElement && (
                  <>
                    <div className="center-guide-v"></div>
                    <div className="center-guide-h"></div>
                  </>
                )}

                {image && (
                  <Rnd
                    size={{ width: imageSize.width, height: imageSize.height }}
                    position={{ x: imagePosition.x, y: imagePosition.y }}
                    bounds="parent"
                    style={{ zIndex: selectedElement === "image" ? 25 : 20 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElement("image");
                    }}
                    enableResizing={selectedElement === "image"}
                    disableDragging={selectedElement !== "image"}
                    onDragStop={(e, d) => setImagePosition({ x: d.x, y: d.y })}
                    onResizeStop={(e, direction, ref, delta, position) => {
                      setImageSize({
                        width: ref.offsetWidth,
                        height: ref.offsetHeight,
                      });
                      setImagePosition({ x: position.x, y: position.y });
                    }}
                  >
                    <img
                      src={image}
                      alt="Logo"
                      className={`design-image${
                        selectedElement === "image" ? " design-selected" : ""
                      }`}
                    />
                  </Rnd>
                )}

                {text && (
                  <Rnd
                    size={{ width: textSize.width, height: textSize.height }}
                    position={{ x: textPosition.x, y: textPosition.y }}
                    bounds="parent"
                    style={{ zIndex: selectedElement === "text" ? 25 : 20 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElement("text");
                    }}
                    enableResizing={selectedElement === "text"}
                    disableDragging={selectedElement !== "text"}
                    onDragStop={(e, d) => setTextPosition({ x: d.x, y: d.y })}
                    onResizeStop={(e, direction, ref, delta, position) => {
                      setTextSize({
                        width: ref.offsetWidth,
                        height: ref.offsetHeight,
                      });
                      setTextPosition({ x: position.x, y: position.y });
                    }}
                  >
                    <div
                      className={`design-text${
                        selectedElement === "text" ? " design-selected" : ""
                      }`}
                      style={{ color: textColor, fontSize: `${fontSize}px` }}
                    >
                      {text}
                    </div>
                  </Rnd>
                )}

                {!image && !text && (
                  <div className="preview-empty-hint">
                    <FaImage />
                    <p>Add text or an image to start designing</p>
                  </div>
                )}
              </div>
            </div>

            {selectedElement && (
              <div className="element-toolbar">
                <span>
                  {selectedElement === "image"
                    ? "Image selected"
                    : "Text selected"}
                </span>
                <button
                  type="button"
                  onClick={() => centerElement(selectedElement)}
                >
                  <FaCrosshairs /> Center
                </button>
                <button
                  type="button"
                  className="element-toolbar-remove"
                  onClick={() => {
                    if (selectedElement === "image") {
                      removeImage();
                    } else {
                      setText("");
                    }
                    setSelectedElement(null);
                  }}
                >
                  <FaTimes /> Remove
                </button>
              </div>
            )}
          </>
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
            <span>Image Upload</span>
            <span>{image ? "₹100" : "₹0"}</span>
          </div>

          <div className="price-row">
            <span>Size</span>
            <span>{selectedSize}</span>
          </div>

          <div className="price-row">
            <span>Quantity</span>
            <span>× {quantity}</span>
          </div>

          <hr />

          <h2>
            Total
            <span>₹{orderTotal}</span>
          </h2>
        </div>
      </div>
    </div>
  );
};

export default Customize;
