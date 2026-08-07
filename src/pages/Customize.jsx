import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  getDoc,
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
  FaAlignLeft,
  FaAlignCenter,
  FaAlignRight,
  FaBolt,
} from "react-icons/fa";
import { Rnd } from "react-rnd";
import { useProductOptions } from "../hooks/useProductOptions";
import { useStock, stockDocId } from "../hooks/useStock";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_QUANTITY = 10;
const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

// Print-quality thresholds. Below LOW_QUALITY_DIMENSION we warn strongly;
// between that and MIN_IMAGE_DIMENSION we give a softer heads-up.
const MIN_IMAGE_DIMENSION = 1000; // px, recommended minimum for a sharp print
const LOW_QUALITY_DIMENSION = 600; // px, below this the print will likely look blurry/pixelated

// Safe margin (px) kept between an aligned element and the canvas edge,
// so "left"/"right" alignment doesn't slam the design right up against
// (or past) the shirt's boundary.
const CANVAS_ALIGN_PADDING = 20;

// Default layout for a fresh design — used both on initial mount and
// whenever resetDesign() clears the canvas, so leftover drag/resize
// coordinates from a previous design never leak into the next one.
const DEFAULT_IMAGE_POSITION = { x: 100, y: 80 };
const DEFAULT_IMAGE_SIZE = { width: 100, height: 100 };
const DEFAULT_TEXT_POSITION = { x: 90, y: 220 };
const DEFAULT_TEXT_SIZE = { width: 150, height: 50 };

// Fallback pricing used only until the live config loads from Firestore,
// or if that document doesn't exist / fails to load. Keep these in sync
// with the defaults you seed in Firestore so the price never jumps
// visibly once the real config arrives.
const DEFAULT_PRICING = {
  basePrice: 499,
  backPrintCharge: 50,
  imageUploadCharge: 100,
  sizeCharges: { XS: 0, S: 0, M: 0, L: 0, XL: 50, XXL: 80 },
};

const PRICING_DOC_PATH = ["settings", "pricing"]; // db collection, doc id

const Customize = () => {
  const location = useLocation();
  const navigate = useNavigate();

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

  // Admin-configurable colors / sizes / neck styles, loaded live from
  // Firestore (settings/productOptions). Falls back to sane defaults
  // internally, so this is never empty.
  const { options, loaded: optionsLoaded } = useProductOptions();
  const activeColors = options.colors.filter((c) => c.active);
  const activeSizes = options.sizes.filter((s) => s.active);
  const activeNecks = options.necks.filter((n) => n.active);

  // Admin-managed stock per color+size+neck combo.
  const { stockMap, loaded: stockLoaded } = useStock();

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

  // Save / cart / buy-now actions each have independent loading states
  // so one doesn't block the others from showing their own spinner.
  const [savingDesign, setSavingDesign] = useState(false);
  const [addingCart, setAddingCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);

  // Low-quality image warning shown as a popup rather than the inline
  // message strip. null = no popup. Shape: { severity: "low" | "soft", width, height }
  const [qualityWarning, setQualityWarning] = useState(null);

  const [cloudinaryUrl, setCloudinaryUrl] = useState("");

  const [use3D, setUse3D] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);

  const [imagePosition, setImagePosition] = useState(DEFAULT_IMAGE_POSITION);
  const [imageSize, setImageSize] = useState(DEFAULT_IMAGE_SIZE);
  const [textPosition, setTextPosition] = useState(DEFAULT_TEXT_POSITION);
  const [textSize, setTextSize] = useState(DEFAULT_TEXT_SIZE);

  // Admin-configurable pricing, loaded from Firestore (settings/pricing).
  // Starts out as the local fallback so the UI never shows a blank price
  // while the real config is in flight.
  const [pricingConfig, setPricingConfig] = useState(DEFAULT_PRICING);
  const [pricingLoaded, setPricingLoaded] = useState(false);

  // Reference to the rendered shirt canvas, used to measure available
  // space when aligning an element.
  const canvasRef = useRef(null);

  // Tracks the image file currently "in flight" for dimension checking,
  // so a stale async result can't pop the quality modal after the user
  // has already removed that image (or replaced it with a new one).
  const pendingQualityCheckRef = useRef(null);

  const hasDesignContent = Boolean(text.trim() || image);

  // Resolve the selected color hex back to its option id, for stock
  // lookups (stock is keyed by id, not hex code).
  const selectedColorId =
    activeColors.find((c) => c.code === selectedColor)?.id || null;

  // Stock for the currently selected color + size + neck combo.
  // No matching entry = treated as always available.
  const currentStockEntry =
    selectedColorId && stockLoaded
      ? stockMap[stockDocId(selectedColorId, selectedSize, neck)]
      : null;

  const isOutOfStock =
  !!currentStockEntry &&
  (!currentStockEntry.inStock || currentStockEntry.quantity <= 0);

const stockLimit =
  currentStockEntry && currentStockEntry.inStock
    ? currentStockEntry.quantity
    : MAX_QUANTITY;

// Different stock states
const hasStockEntry = !!currentStockEntry;
const availableQty = currentStockEntry?.quantity || 0;

const stockStatus = !hasStockEntry
  ? "available"
  : isOutOfStock
  ? "out"
  : availableQty <= 3
  ? "critical"
  : availableQty <= 10
  ? "low"
  : "good";

  const anyActionInProgress = savingDesign || addingCart || buyingNow;

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setUse3D(false);
    }
  }, []);

  // Load admin-set pricing once on mount. If the document is missing or
  // the read fails, we silently keep DEFAULT_PRICING rather than blocking
  // the page — pricing should degrade gracefully, not break checkout.
  useEffect(() => {
    let cancelled = false;

    const loadPricing = async () => {
      try {
        const snap = await getDoc(doc(db, ...PRICING_DOC_PATH));

        if (!cancelled && snap.exists()) {
          const data = snap.data();

          setPricingConfig({
            basePrice: Number(data.basePrice ?? DEFAULT_PRICING.basePrice),
            backPrintCharge: Number(
              data.backPrintCharge ?? DEFAULT_PRICING.backPrintCharge,
            ),
            imageUploadCharge: Number(
              data.imageUploadCharge ?? DEFAULT_PRICING.imageUploadCharge,
            ),
            sizeCharges: {
              ...DEFAULT_PRICING.sizeCharges,
              ...(data.sizeCharges || {}),
            },
          });
        }
      } catch (err) {
        console.warn("Could not load pricing config, using defaults:", err);
      } finally {
        if (!cancelled) setPricingLoaded(true);
      }
    };

    loadPricing();
    return () => {
      cancelled = true;
    };
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

  // If the currently-selected color/size/neck was deactivated or removed
  // by the admin, fall back to the first still-active option once the
  // live options have loaded. Skipped in edit mode's first render pass
  // since that effect above may still be applying the saved design.
  useEffect(() => {
    if (!optionsLoaded) return;

    if (
      activeColors.length &&
      !activeColors.some((c) => c.code === selectedColor)
    ) {
      setSelectedColor(activeColors[0].code);
    }
    if (
      activeSizes.length &&
      !activeSizes.some((s) => s.id === selectedSize)
    ) {
      setSelectedSize(activeSizes[0].id);
    }
    if (activeNecks.length && !activeNecks.some((n) => n.id === neck)) {
      setNeck(activeNecks[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsLoaded, options]);

  // Clamp quantity down if the selected combo's stock is lower than
  // what the user had picked for a previous (now-changed) combo.
  useEffect(() => {
    if (stockLimit > 0 && quantity > stockLimit) {
      setQuantity(Math.max(1, stockLimit));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockLimit]);

  // Price is now fully driven by pricingConfig (admin-controlled via
  // Firestore) instead of hardcoded numbers.
  const backPrintCharge = side === "back" ? pricingConfig.backPrintCharge : 0;
  const imageCharge = image ? pricingConfig.imageUploadCharge : 0;
  const sizeCharge = pricingConfig.sizeCharges[selectedSize] || 0;

  const finalPrice =
    pricingConfig.basePrice + backPrintCharge + imageCharge + sizeCharge;

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

  // Reads an image file's real pixel dimensions (not its file size) so
  // we can warn the user if it's too small to print sharply.
  const getImageDimensions = (file) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(objectUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Could not read image dimensions."));
      };

      img.src = objectUrl;
    });

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

    // Mark this file as the one we're currently checking, so a stale
    // async result (from a file the user has since removed/replaced)
    // can't pop the quality modal after the fact.
    pendingQualityCheckRef.current = file;

    // Quality check — informational only, never blocks the upload.
    // Low-resolution results surface as a popup (qualityWarning) rather
    // than the inline message strip, so they're hard to miss.
    try {
      const { width, height } = await getImageDimensions(file);

      if (pendingQualityCheckRef.current !== file) {
        // A newer file has since been selected, or this one was removed —
        // ignore this now-stale result.
        return;
      }

      if (width < LOW_QUALITY_DIMENSION || height < LOW_QUALITY_DIMENSION) {
        setQualityWarning({ severity: "low", width, height });
      } else if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
        setQualityWarning({ severity: "soft", width, height });
      } else {
        setQualityWarning(null);
      }
    } catch (dimErr) {
      console.warn("Could not verify image quality:", dimErr);
    }

    try {
      await uploadImageToCloudinary(file);
    } catch (error) {
      console.error("Image upload failed:", error);
      setMessage("❌ Image upload failed.");
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    processImageFile(file);
    // Reset the input value so selecting the same file again (e.g. after
    // removing it) still fires onChange.
    e.target.value = "";
  };

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
    // Invalidate any in-flight quality check for the file being removed.
    pendingQualityCheckRef.current = null;
    setImage(null);
    setImageFile(null);
    setCloudinaryUrl("");
    setQualityWarning(null);
    // Keep selection state in sync — if the image was the selected
    // element, there's nothing left to have selected.
    setSelectedElement((prev) => (prev === "image" ? null : prev));
  };

  // Dismiss the quality popup and keep the image as-is.
  const keepLowQualityImage = () => setQualityWarning(null);

  // Dismiss the quality popup and remove the offending image so the
  // user can pick a better one.
  const discardLowQualityImage = () => {
    removeImage();
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

    pendingQualityCheckRef.current = null;

    setText("");
    setSide("front");
    setSelectedColor(activeColors[0]?.code || "#ffffff");
    setSelectedSize(activeSizes[0]?.id || "M");
    setFontSize(18);
    setTextColor("#000000");
    setNeck(activeNecks[0]?.id || "round");
    setQuantity(1);

    setImage(null);
    setImageFile(null);
    setCloudinaryUrl("");
    setMessage("");
    setSelectedElement(null);
    setQualityWarning(null);

    // Restore layout back to defaults so the next design doesn't inherit
    // stale drag/resize coordinates from whatever was on the canvas before.
    setImagePosition(DEFAULT_IMAGE_POSITION);
    setImageSize(DEFAULT_IMAGE_SIZE);
    setTextPosition(DEFAULT_TEXT_POSITION);
    setTextSize(DEFAULT_TEXT_SIZE);

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
      colorId: selectedColorId, // NEW — lets stock decrement match this line item
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

  // Shared cart-write logic used by both "Add to Cart" and "Buy Now" —
  // builds the design, then either bumps an existing matching cart row's
  // quantity or inserts a new one. Returns "updated" or "added".
  const addDesignToCart = async () => {
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

      return "updated";
    }

    await addDoc(collection(db, "cart"), { ...designData, quantity });
    return "added";
  };

  const addToCart = async () => {
    if (!hasDesignContent) {
      setMessage("❌ Add some text or an image before adding to cart.");
      return;
    }

    if (isOutOfStock) {
      setMessage(
        "❌ This color/size/neck combination is currently out of stock.",
      );
      return;
    }

    try {
      setAddingCart(true);
      setMessage("");

      const result = await addDesignToCart();
      setMessage(
        result === "updated"
          ? "🛒 Quantity updated in cart!"
          : "✅ Added to cart!",
      );
    } catch (err) {
      console.error("Add to cart failed:", err);
      setMessage("❌ " + (err.message || "Failed to add to cart."));
    } finally {
      setAddingCart(false);
    }
  };

  // "Buy Now" skips staying on this page — it writes the current design
  // straight to the cart (same dedupe logic as Add to Cart) and takes
  // the user directly to the cart/checkout page.
  const buyNow = async () => {
    if (!hasDesignContent) {
      setMessage("❌ Add some text or an image before proceeding to checkout.");
      return;
    }

    if (isOutOfStock) {
      setMessage(
        "❌ This color/size/neck combination is currently out of stock.",
      );
      return;
    }

    try {
      setBuyingNow(true);
      setMessage("");

      await addDesignToCart();
      navigate("/cart");
    } catch (err) {
      console.error("Buy now failed:", err);
      setMessage("❌ " + (err.message || "Failed to proceed to checkout."));
      setBuyingNow(false);
    }
  };

  // Clicking empty shirt space deselects whatever's currently selected.
  const handleCanvasBackgroundClick = () => setSelectedElement(null);

  // Aligns the given element (image or text) horizontally within the
  // canvas — left edge, centered, or right edge. Keeps a small safe
  // margin (CANVAS_ALIGN_PADDING) from the shirt's edges so "left"/
  // "right" doesn't push the design flush against — or past — the
  // canvas boundary, and uses clientWidth (content box) rather than
  // getBoundingClientRect (which can include border) for accuracy.
  const alignElement = (type, alignment) => {
    if (!canvasRef.current) return;
    const canvasWidth = canvasRef.current.clientWidth;
    const size = type === "image" ? imageSize : textSize;
    const setPosition = type === "image" ? setImagePosition : setTextPosition;

    const maxX = Math.max(
      CANVAS_ALIGN_PADDING,
      canvasWidth - size.width - CANVAS_ALIGN_PADDING,
    );

    let x;
    if (alignment === "left") {
      x = CANVAS_ALIGN_PADDING;
    } else if (alignment === "right") {
      x = maxX;
    } else {
      x = Math.max(0, (canvasWidth - size.width) / 2);
    }

    setPosition((prev) => ({ ...prev, x }));
  };

  const isError = message.startsWith("❌");
  const isOverlapping = (pos1, size1, pos2, size2, padding = 10) => {
    return !(
      pos1.x + size1.width + padding < pos2.x ||
      pos2.x + size2.width + padding < pos1.x ||
      pos1.y + size1.height + padding < pos2.y ||
      pos2.y + size2.height + padding < pos1.y
    );
  };
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
            {activeColors.map((color) => (
              <div key={color.id} className="color-item">
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
            {activeSizes.map((size) => (
              <button
                key={size.id}
                type="button"
                className={
                  selectedSize === size.id ? "size-btn active-size" : "size-btn"
                }
                onClick={() => setSelectedSize(size.id)}
              >
                {size.label}
              </button>
            ))}
          </div>

          <label htmlFor="neck-style">Neck Style</label>
          <select
            id="neck-style"
            value={neck}
            onChange={(e) => setNeck(e.target.value)}
          >
            {activeNecks.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>

        {stockLoaded && (
  <div
    className={`stock-badge ${
      stockStatus === "out"
        ? "out"
        : stockStatus === "critical"
        ? "critical"
        : stockStatus === "low"
        ? "low"
        : "in"
    }`}
  >
    {stockStatus === "available" && (
      <>
        ✅ Available
        <small>
          This combination is currently available for ordering.
        </small>
      </>
    )}

    {stockStatus === "good" && (
      <>
        ✅ In Stock
        <small>{availableQty} pieces available.</small>
      </>
    )}

    {stockStatus === "low" && (
      <>
        ⚠️ Low Stock
        <small>Only {availableQty} pieces remaining.</small>
      </>
    )}

    {stockStatus === "critical" && (
      <>
        🔥 Almost Sold Out
        <small>Hurry! Only {availableQty} left.</small>
      </>
    )}

    {stockStatus === "out" && (
      <>
        ❌ Out of Stock
        <small>
          This Color + Size + Neck combination is currently unavailable.
          Please choose another option.
        </small>
      </>
    )}
  </div>
)}
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
              onClick={() =>
                setQuantity((q) => Math.min(stockLimit, MAX_QUANTITY, q + 1))
              }
              disabled={quantity >= Math.min(stockLimit, MAX_QUANTITY)}
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
            className="buy-now-btn"
            onClick={buyNow}
            disabled={anyActionInProgress || isOutOfStock}
          >
            {buyingNow ? (
              <>
                <span className="spinner"></span>
                Processing...
              </>
            ) : isOutOfStock ? (
              "Out of Stock"
            ) : (
              <>
                <FaBolt /> Buy Now
              </>
            )}
          </button>

          <button
            className="cart-btn"
            onClick={addToCart}
            disabled={anyActionInProgress || isOutOfStock}
          >
            {addingCart ? (
              <>
                <span className="spinner"></span>
                Adding...
              </>
            ) : isOutOfStock ? (
              "Out of Stock"
            ) : (
              "🛒 Add to Cart"
            )}
          </button>
        </div>

        <div className="button-group">
          <button
            className="save-btn"
            onClick={saveDesign}
            disabled={anyActionInProgress}
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

      {/* IMAGE QUALITY POPUP */}
      {qualityWarning && (
        <div
          className="quality-modal-backdrop"
          onClick={keepLowQualityImage}
        >
          <div
            className="quality-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="quality-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="quality-modal-icon">
              <FaImage />
            </div>

            <h3 id="quality-modal-title">
              {qualityWarning.severity === "low"
                ? "This image is quite low resolution"
                : "Image resolution is a little low"}
            </h3>

            <p>
              {qualityWarning.severity === "low" ? (
                <>
                  Your upload is{" "}
                  <strong>
                    {qualityWarning.width}×{qualityWarning.height}px
                  </strong>{" "}
                  and will likely look blurry or pixelated when printed. For
                  best results, use an image that's at least{" "}
                  <strong>
                    {MIN_IMAGE_DIMENSION}×{MIN_IMAGE_DIMENSION}px
                  </strong>
                  .
                </>
              ) : (
                <>
                  Your upload is{" "}
                  <strong>
                    {qualityWarning.width}×{qualityWarning.height}px
                  </strong>
                  . It should still print okay, but{" "}
                  <strong>
                    {MIN_IMAGE_DIMENSION}×{MIN_IMAGE_DIMENSION}px
                  </strong>{" "}
                  or larger will look sharper.
                </>
              )}
            </p>

            <div className="quality-modal-actions">
              <button
                type="button"
                className="quality-modal-remove"
                onClick={discardLowQualityImage}
              >
                Remove &amp; choose another
              </button>
              <button
                type="button"
                className="quality-modal-keep"
                onClick={keepLowQualityImage}
              >
                Use this image anyway
              </button>
            </div>
          </div>
        </div>
      )}

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
                    onDragStop={(e, d) => {
                      const newPos = { x: d.x, y: d.y };

                      if (
                        text &&
                        isOverlapping(newPos, imageSize, textPosition, textSize)
                      ) {
                        return;
                      }

                      setImagePosition(newPos);
                    }}
                    onResizeStop={(e, direction, ref, delta, position) => {
                      const newSize = {
                        width: ref.offsetWidth,
                        height: ref.offsetHeight,
                      };

                      const newPos = {
                        x: position.x,
                        y: position.y,
                      };

                      if (
                        text &&
                        isOverlapping(newPos, newSize, textPosition, textSize)
                      ) {
                        return;
                      }

                      setImageSize(newSize);
                      setImagePosition(newPos);
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
                    onDragStop={(e, d) => {
                      const newPos = { x: d.x, y: d.y };

                      if (
                        image &&
                        isOverlapping(
                          newPos,
                          textSize,
                          imagePosition,
                          imageSize,
                        )
                      ) {
                        return;
                      }

                      setTextPosition(newPos);
                    }}
                    onResizeStop={(e, direction, ref, delta, position) => {
                      const newSize = {
                        width: ref.offsetWidth,
                        height: ref.offsetHeight,
                      };

                      const newPos = {
                        x: position.x,
                        y: position.y,
                      };

                      if (
                        image &&
                        isOverlapping(newPos, newSize, imagePosition, imageSize)
                      ) {
                        return;
                      }

                      setTextSize(newSize);
                      setTextPosition(newPos);
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
                  onClick={() => alignElement(selectedElement, "left")}
                >
                  <FaAlignLeft /> Left
                </button>
                <button
                  type="button"
                  onClick={() => alignElement(selectedElement, "center")}
                >
                  <FaAlignCenter /> Center
                </button>
                <button
                  type="button"
                  onClick={() => alignElement(selectedElement, "right")}
                >
                  <FaAlignRight /> Right
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

          {!pricingLoaded && (
            <small className="upload-status">Loading current pricing...</small>
          )}

          <div className="price-row">
            <span>Base Price</span>
            <span>₹{pricingConfig.basePrice}</span>
          </div>

          <div className="price-row">
            <span>Back Print</span>
            <span>₹{backPrintCharge}</span>
          </div>

          <div className="price-row">
            <span>Image Upload</span>
            <span>₹{imageCharge}</span>
          </div>

          <div className="price-row">
            <span>Size ({selectedSize})</span>
            <span>{sizeCharge > 0 ? `₹${sizeCharge}` : "₹0"}</span>
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