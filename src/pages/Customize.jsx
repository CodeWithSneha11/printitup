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

// Raised from the old 5MB cap now that we compress client-side before
// upload (see compressImageFile below) — this is the ceiling on what a
// user can *select*, not what actually reaches Cloudinary. Modern phone
// photos routinely land in the 6-10MB range straight out of the camera,
// so a hard 5MB wall was rejecting perfectly good source images that
// would have compressed down fine.
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const MAX_QUANTITY = 10;
const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

// Physical width (inches) the print canvas represents edge-to-edge — i.e.
// your actual production print area (e.g. DTG print width). Tune this to
// match reality; every DPI figure below is derived from it, so if it's
// off, the quality grading will be too.
const PRINT_AREA_WIDTH_INCHES = 12;

// Effective-DPI tiers, computed from an image's real pixel dimensions
// relative to how large it's actually PLACED on the shirt (imageSize),
// not just the raw file's resolution. A 4000px image stretched to cover
// the whole front reads very differently than the same file kept small —
// fixed pixel thresholds miss that entirely.
const DPI_EXCELLENT = 300;
const DPI_GOOD = 200;
const DPI_ACCEPTABLE = 150;
// Below DPI_ACCEPTABLE is the "Warning" tier.

// Client-side compression settings, applied before the file ever reaches
// Cloudinary. This is what actually resolves the "blurry vs. free-tier
// bandwidth" tension: the dimension ceiling is set high enough to still
// hit DPI_EXCELLENT at full print width, while file size (the thing that
// actually drives Cloudinary bandwidth/storage credits) is brought down
// independently via re-encoding quality.
const COMPRESS_MAX_DIMENSION = PRINT_AREA_WIDTH_INCHES * DPI_EXCELLENT; // 3600px
const COMPRESS_JPEG_QUALITY = 0.85;
// Files already at/under this size skip compression entirely — no point
// spending CPU re-encoding something that's already small and won't
// meaningfully shrink further.
const COMPRESS_SKIP_BELOW = 800 * 1024; // 800KB

// Safe margin (px) kept between an aligned element and the canvas edge,
// so "left"/"right" alignment doesn't slam the design right up against
// (or past) the shirt's boundary.
const CANVAS_ALIGN_PADDING = 20;

// How long the "blocked" flash stays on an element when a drag/resize
// is rejected for overlapping the other element.
const OVERLAP_FLASH_MS = 350;

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
  // message strip. null = no popup. Shape: { tier: "acceptable" | "low", dpi }
  const [qualityWarning, setQualityWarning] = useState(null);

  // Pixel dimensions of the uploaded image AFTER any compression — this
  // is what actually gets printed, so it's what effectiveDPI (below) is
  // computed from. null while nothing's uploaded or a check is in flight.
  const [imageNaturalSize, setImageNaturalSize] = useState(null);

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

  // Which element (if any) just had a drag/resize rejected for
  // overlapping the other element. Drives a brief visual "blocked"
  // flash so the snap-back isn't silent. null = no flash active.
  const [blockedElement, setBlockedElement] = useState(null);
  const blockedFlashTimerRef = useRef(null);

  // Reference to the rendered shirt canvas, used to measure available
  // space when aligning an element.
  const canvasRef = useRef(null);

  // Tracks the image file currently "in flight" (quality check +
  // compression + upload), so a stale async result can't apply itself
  // after the user has already removed that image (or replaced it with
  // a new one). Keyed on the ORIGINAL File object the user selected.
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

  // Effective print DPI for the currently uploaded image, given how large
  // it's ACTUALLY placed on the canvas right now (imageSize) — not just
  // its raw resolution. Recomputes on every render, so it updates live
  // as the user drags/resizes the image on the shirt. Only meaningful in
  // 2D view, since that's the canvas the print area maps onto.
  const effectiveDPI = (() => {
    if (use3D || !imageNaturalSize || !canvasRef.current) return null;
    const canvasWidth = canvasRef.current.clientWidth;
    if (!canvasWidth) return null;

    const inchesPerCanvasPx = PRINT_AREA_WIDTH_INCHES / canvasWidth;
    const printWidthInches = imageSize.width * inchesPerCanvasPx;
    if (printWidthInches <= 0) return null;

    return Math.round(imageNaturalSize.width / printWidthInches);
  })();

  const dpiTier = (dpi) => {
    if (dpi == null) return null;
    if (dpi >= DPI_EXCELLENT) return "excellent";
    if (dpi >= DPI_GOOD) return "good";
    if (dpi >= DPI_ACCEPTABLE) return "acceptable";
    return "low";
  };

  const currentDpiTier = dpiTier(effectiveDPI);

  const dpiTierLabel = {
    excellent: "Excellent",
    good: "Good",
    acceptable: "Acceptable",
    low: "Low quality",
  };

  const dpiTierColor = {
    excellent: "#16a34a",
    good: "#0891b2",
    acceptable: "#d97706",
    low: "#ef4444",
  };

  // Pops the quality warning modal right after a new image loads (and its
  // real dimensions are known), graded against its DPI at the size it's
  // placed at that moment. Deliberately fires only when imageNaturalSize
  // changes (a genuinely new/replaced image) — not on every resize, or
  // the popup would reappear every time the user drags a resize handle.
  // Live feedback while resizing comes from the DPI badge in the element
  // toolbar instead, which does update continuously.
  useEffect(() => {
    if (!imageNaturalSize || use3D) return;

    const tier = dpiTier(effectiveDPI);

    if (tier === "acceptable" || tier === "low") {
      setQualityWarning({ tier, dpi: effectiveDPI });
    } else {
      setQualityWarning(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageNaturalSize]);

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
  // Keyed on the incoming product's id (rather than running once on an
  // empty dep array) so that navigating here again with a *different*
  // product — without this component unmounting in between — still
  // picks up the new product instead of leaving stale fields behind.
  useEffect(() => {
    if (!incomingProduct) return;

    setSelectedProduct(incomingProduct);

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
  }, [incomingProduct?.id]);

  // Restore a previously saved design when arriving in edit mode.
  // Keyed on the design's id for the same reason as above — so opening
  // "Edit design" for a second, different design re-syncs the form
  // instead of leaving the first design's fields in place.
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
    } else {
      setImage(null);
      setCloudinaryUrl("");
    }

    setImagePosition(incomingDesign.imagePosition || DEFAULT_IMAGE_POSITION);
    setImageSize(incomingDesign.imageSize || DEFAULT_IMAGE_SIZE);
    setTextPosition(incomingDesign.textPosition || DEFAULT_TEXT_POSITION);
    setTextSize(incomingDesign.textSize || DEFAULT_TEXT_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, incomingDesign?.id]);

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
  // When stockLimit is 0 (in-stock flag true but zero quantity), the
  // buy/cart buttons are already disabled via isOutOfStock — but we
  // still clamp the displayed quantity to 1 rather than leaving a
  // stale higher number shown next to an "Out of Stock" badge.
  useEffect(() => {
    const effectiveLimit = stockLimit > 0 ? stockLimit : 1;
    if (quantity > effectiveLimit) {
      setQuantity(effectiveLimit);
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

  // Clear any pending "blocked" flash timer on unmount.
  useEffect(() => {
    return () => {
      if (blockedFlashTimerRef.current) {
        clearTimeout(blockedFlashTimerRef.current);
      }
    };
  }, []);

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

  // Reads an image's real pixel dimensions and, if needed, shrinks +
  // re-encodes it before it ever reaches Cloudinary — in one decode pass,
  // returning the FINAL dimensions (post-compression) since those are
  // what actually determines print DPI, not the original file's.
  //
  //  - Dimensions are only capped at COMPRESS_MAX_DIMENSION, which is
  //    deliberately set to PRINT_AREA_WIDTH_INCHES × DPI_EXCELLENT so a
  //    full-width print can still hit the top DPI tier.
  //  - File size is brought down independently via COMPRESS_JPEG_QUALITY
  //    re-encoding — this is where the real bandwidth savings come from
  //    (a 10MB phone photo routinely lands well under 2MB with no
  //    visible loss), without touching dimensions/DPI.
  //  - PNGs stay PNG (not flattened to JPEG) so a transparent logo
  //    doesn't gain a baked-in white background — only resized if
  //    larger than the dimension cap.
  //  - Small/already-efficient files pass through untouched.
  //  - Any failure rejects, and the caller falls back to treating the
  //    upload as best-effort rather than blocking on it.
  const prepareImageForUpload = (file) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        const originalWidth = img.naturalWidth;
        const originalHeight = img.naturalHeight;
        const longEdge = Math.max(originalWidth, originalHeight);

        const needsCompression =
          file.size > COMPRESS_SKIP_BELOW || longEdge > COMPRESS_MAX_DIMENSION;

        if (!needsCompression) {
          URL.revokeObjectURL(objectUrl);
          resolve({ file, width: originalWidth, height: originalHeight });
          return;
        }

        const scale =
          longEdge > COMPRESS_MAX_DIMENSION
            ? COMPRESS_MAX_DIMENSION / longEdge
            : 1;
        const targetW = Math.round(originalWidth * scale);
        const targetH = Math.round(originalHeight * scale);

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, targetW, targetH);

        const outputType =
          file.type === "image/png" ? "image/png" : "image/jpeg";
        const quality =
          outputType === "image/jpeg" ? COMPRESS_JPEG_QUALITY : undefined;

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);

            if (!blob || blob.size >= file.size) {
              // Compression didn't help (or failed) — keep the original.
              resolve({ file, width: originalWidth, height: originalHeight });
              return;
            }

            const ext = outputType === "image/png" ? "png" : "jpg";
            const newName = file.name.replace(/\.[^.]+$/, "") + `.${ext}`;
            const compressedFile = new File([blob], newName, {
              type: outputType,
            });
            resolve({ file: compressedFile, width: targetW, height: targetH });
          },
          outputType,
          quality,
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Could not read image."));
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
      setMessage("❌ Maximum image size is 8MB.");
      return;
    }

    setMessage("");
    setSelectedElement("image");

    // Mark this file as the one currently in flight, so any stale async
    // result below (dimension read, compression, or upload) from a file
    // the user has since removed or replaced gets silently ignored.
    pendingQualityCheckRef.current = file;

    // Show an instant preview from the original file — don't make the
    // user wait on compression just to see their pick on the shirt.
    const previewUrl = URL.createObjectURL(file);
    setImage(previewUrl);
    setImageFile(file);
    // Cleared until the real (possibly compressed) dimensions are known,
    // so the DPI badge doesn't briefly show a stale value from the
    // previous image.
    setImageNaturalSize(null);

    let prepared = null;
    try {
      prepared = await prepareImageForUpload(file);
    } catch (err) {
      console.warn("Could not read/compress image:", err);
    }

    if (pendingQualityCheckRef.current !== file) {
      // A newer file was selected (or this one removed) while we were
      // processing — drop the now-abandoned preview and bail.
      URL.revokeObjectURL(previewUrl);
      return;
    }

    const uploadFile = prepared ? prepared.file : file;

    if (prepared) {
      // Drives both the DPI badge and the quality-warning effect above.
      setImageNaturalSize({ width: prepared.width, height: prepared.height });

      // Swap in the compressed file/preview only if compression actually
      // produced a different file.
      if (prepared.file !== file) {
        URL.revokeObjectURL(previewUrl);
        setImageFile(prepared.file);
        setImage(URL.createObjectURL(prepared.file));
      }
    }

    try {
      await uploadImageToCloudinary(uploadFile);
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
    // Invalidate any in-flight quality check / compression / upload for
    // the file being removed.
    pendingQualityCheckRef.current = null;
    setImage(null);
    setImageFile(null);
    setCloudinaryUrl("");
    setQualityWarning(null);
    setImageNaturalSize(null);
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
    setImageNaturalSize(null);

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

    // FIX: hash the *resolved* image URL rather than transient File
    // metadata (name/size/lastModified). File metadata is only present
    // right after a fresh upload — for edit-mode designs or designs
    // carried over from a product, imageFile is null and those fields
    // used to silently collapse to "", 0, 0, which could make two
    // different pre-existing images hash identically (wrongly merged
    // in the cart) or make re-adding an edited design hash differently
    // from the original add (breaking the intended dedupe/quantity-bump
    // behavior). The resolved URL is stable across all of these paths.
    const designId = await generateDesignId({
      text,
      side,
      tshirtColor: selectedColor,
      size: selectedSize,
      textColor,
      fontSize: Number(fontSize),
      neck,
      imageUrl: imageUrl || "",
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
      colorId: selectedColorId, // lets stock decrement match this line item
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

  // FIX: drag/resize used to reject silently on overlap — Rnd (being
  // controlled) would snap back to the last committed position/size
  // with no feedback at all. This triggers a brief visual flash on the
  // rejected element instead, via the `blockedElement` state consumed
  // by inline styles below.
  const flashBlocked = (type) => {
    if (blockedFlashTimerRef.current) {
      clearTimeout(blockedFlashTimerRef.current);
    }
    setBlockedElement(type);
    blockedFlashTimerRef.current = setTimeout(() => {
      setBlockedElement(null);
      blockedFlashTimerRef.current = null;
    }, OVERLAP_FLASH_MS);
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

  const blockedOutlineStyle = {
    outline: "2px solid #ef4444",
    outlineOffset: "2px",
    transition: "outline-color 0.15s ease",
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
          <small className="character-count">
            Max 8MB. We check print sharpness based on the actual size
            you place it at — bigger placement needs a higher-res image.
          </small>

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
                    This Color + Size + Neck combination is currently
                    unavailable. Please choose another option.
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
              {qualityWarning.tier === "low"
                ? "This will likely print blurry"
                : "Print quality is just okay at this size"}
            </h3>

            <p>
              {qualityWarning.tier === "low" ? (
                <>
                  At its current size on the shirt, this image works out to
                  about <strong>{qualityWarning.dpi} DPI</strong> — below{" "}
                  <strong>{DPI_ACCEPTABLE} DPI</strong>, so it'll likely look
                  soft or pixelated when printed. Try a higher-resolution
                  image, or make the design smaller on the canvas.
                </>
              ) : (
                <>
                  At its current size on the shirt, this image works out to
                  about <strong>{qualityWarning.dpi} DPI</strong> —
                  printable, but below the <strong>{DPI_GOOD} DPI</strong> we'd
                  call sharp. Shrinking it on the canvas or using a
                  higher-res image will look crisper.
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
                    style={{
                      zIndex: selectedElement === "image" ? 25 : 20,
                      ...(blockedElement === "image" ? blockedOutlineStyle : {}),
                    }}
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
                        flashBlocked("image");
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
                        flashBlocked("image");
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
                    style={{
                      zIndex: selectedElement === "text" ? 25 : 20,
                      ...(blockedElement === "text" ? blockedOutlineStyle : {}),
                    }}
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
                        flashBlocked("text");
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
                        flashBlocked("text");
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

                {selectedElement === "image" && currentDpiTier && (
                  <span
                    className="dpi-badge"
                    style={{
                      color: dpiTierColor[currentDpiTier],
                      fontWeight: 600,
                      fontSize: "0.85em",
                    }}
                    title={`Estimated print quality at the current placed size (assumes a ${PRINT_AREA_WIDTH_INCHES}" wide print area)`}
                  >
                    {dpiTierLabel[currentDpiTier]} · {effectiveDPI} DPI
                  </span>
                )}

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