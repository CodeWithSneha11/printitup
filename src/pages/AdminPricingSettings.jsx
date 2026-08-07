import React, { useState, useEffect, useRef, useMemo } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  FiTag,
  FiPackage,
  FiTruck,
  FiPercent,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
  FiX,
} from "react-icons/fi";
import "../styles/AdminPricingSettings.css";

const DEFAULT_PRICING = {
  basePrice: 499,
  backPrintCharge: 50,
  imageUploadCharge: 100,
  sizeCharges: { XS: 0, S: 0, M: 0, L: 0, XL: 50, XXL: 80 },
  deliveryCharge: 49,
  freeDeliveryThreshold: 999,
  gstPercent: 5,
};

const sizes = ["XS", "S", "M", "L", "XL", "XXL"];

const AdminPricingSettings = () => {
  const [pricing, setPricing] = useState(DEFAULT_PRICING);
  const [savedSnapshot, setSavedSnapshot] = useState(DEFAULT_PRICING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type: "success"|"error", text }
  const toastTimer = useRef(null);

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "pricing"));
        if (snap.exists()) {
          const data = snap.data();
          const merged = {
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
            deliveryCharge: Number(
              data.deliveryCharge ?? DEFAULT_PRICING.deliveryCharge,
            ),
            freeDeliveryThreshold: Number(
              data.freeDeliveryThreshold ?? DEFAULT_PRICING.freeDeliveryThreshold,
            ),
            gstPercent: Number(data.gstPercent ?? DEFAULT_PRICING.gstPercent),
          };
          setPricing(merged);
          setSavedSnapshot(merged);
        } else {
          setSavedSnapshot(DEFAULT_PRICING);
        }
      } catch (err) {
        console.error("Failed to load pricing:", err);
        showToast("error", "Could not load current pricing.");
      } finally {
        setLoading(false);
      }
    };

    loadPricing();
  }, []);

  const showToast = (type, text) => {
    clearTimeout(toastTimer.current);
    setToast({ type, text });
    if (type === "success") {
      toastTimer.current = setTimeout(() => setToast(null), 4000);
    }
  };

  const updateField = (field, value) => {
    setPricing((prev) => ({ ...prev, [field]: Number(value) || 0 }));
  };

  const updateSizeCharge = (size, value) => {
    setPricing((prev) => ({
      ...prev,
      sizeCharges: { ...prev.sizeCharges, [size]: Number(value) || 0 },
    }));
  };

  const isDirty = useMemo(
    () => JSON.stringify(pricing) !== JSON.stringify(savedSnapshot),
    [pricing, savedSnapshot],
  );

  const savePricing = async () => {
    try {
      setSaving(true);

      await setDoc(
        doc(db, "settings", "pricing"),
        {
          ...pricing,
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser?.uid || null,
        },
        { merge: true },
      );

      setSavedSnapshot(pricing);
      showToast("success", "Pricing updated — new page loads will use these values.");
    } catch (err) {
      console.error("Failed to save pricing:", err);
      showToast("error", err.message || "Failed to save pricing.");
    } finally {
      setSaving(false);
    }
  };

  // ==========================
  // LIVE EXAMPLE CALCULATION
  // ==========================

  const exampleSubtotal =
    pricing.basePrice + (pricing.sizeCharges.M || 0) + pricing.backPrintCharge;
  const exampleDelivery =
    pricing.freeDeliveryThreshold > 0 &&
    exampleSubtotal >= pricing.freeDeliveryThreshold
      ? 0
      : pricing.deliveryCharge;
  const exampleGst = Math.round(
    ((exampleSubtotal + exampleDelivery) * pricing.gstPercent) / 100,
  );
  const exampleTotal = exampleSubtotal + exampleDelivery + exampleGst;

  if (loading) {
    return (
      <div className="admin-pricing-settings">
        <div className="pricing-skeleton">
          <div className="skeleton-line skeleton-title" />
          <div className="skeleton-line skeleton-subtitle" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-pricing-settings">
      <div className="pricing-page-header">
        <span className="pricing-eyebrow">Admin / Store settings</span>
        <h2>Pricing</h2>
        <p className="admin-pricing-subtitle">
          These values drive the price shown to customers on the Customize page.
        </p>
      </div>

      <div className={`pricing-layout ${saving ? "is-saving" : ""}`}>
        <div className="pricing-main">
          {/* PRODUCT PRICING */}
          <section className="pricing-card">
            <div className="pricing-card-header">
              <span className="pricing-card-icon"><FiTag /></span>
              <div>
                <h3>Product pricing</h3>
                <p className="pricing-section-hint">
                  Base cost of a standard tee before size or add-ons.
                </p>
              </div>
            </div>

            <div className="two-col-grid">
              <div className="pricing-field">
                <label htmlFor="base-price">Base price</label>
                <div className="input-with-prefix">
                  <span>₹</span>
                  <input
                    id="base-price"
                    type="number"
                    min="0"
                    value={pricing.basePrice}
                    onChange={(e) => updateField("basePrice", e.target.value)}
                  />
                </div>
              </div>

              <div className="pricing-field">
                <label htmlFor="back-print-charge">Back print charge</label>
                <div className="input-with-prefix">
                  <span>₹</span>
                  <input
                    id="back-print-charge"
                    type="number"
                    min="0"
                    value={pricing.backPrintCharge}
                    onChange={(e) => updateField("backPrintCharge", e.target.value)}
                  />
                </div>
              </div>

              <div className="pricing-field">
                <label htmlFor="image-upload-charge">Image upload charge</label>
                <div className="input-with-prefix">
                  <span>₹</span>
                  <input
                    id="image-upload-charge"
                    type="number"
                    min="0"
                    value={pricing.imageUploadCharge}
                    onChange={(e) => updateField("imageUploadCharge", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* SIZE SURCHARGES */}
          <section className="pricing-card">
            <div className="pricing-card-header">
              <span className="pricing-card-icon"><FiPackage /></span>
              <div>
                <h3>Size surcharges</h3>
                <p className="pricing-section-hint">
                  Added on top of the base price for that size — 0 means no extra charge.
                </p>
              </div>
            </div>

            <div className="size-charge-grid">
              {sizes.map((size) => (
                <div key={size} className="pricing-field">
                  <label htmlFor={`size-${size}`}>{size}</label>
                  <div className="input-with-prefix">
                    <span>₹</span>
                    <input
                      id={`size-${size}`}
                      type="number"
                      min="0"
                      value={pricing.sizeCharges[size] ?? 0}
                      onChange={(e) => updateSizeCharge(size, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* DELIVERY */}
          <section className="pricing-card">
            <div className="pricing-card-header">
              <span className="pricing-card-icon"><FiTruck /></span>
              <div>
                <h3>Delivery</h3>
                <p className="pricing-section-hint">
                  Flat fee, waived once the subtotal clears the free-delivery threshold.
                  Set the threshold to 0 to always charge delivery.
                </p>
              </div>
            </div>

            <div className="two-col-grid">
              <div className="pricing-field">
                <label htmlFor="delivery-charge">Delivery charge</label>
                <div className="input-with-prefix">
                  <span>₹</span>
                  <input
                    id="delivery-charge"
                    type="number"
                    min="0"
                    value={pricing.deliveryCharge}
                    onChange={(e) => updateField("deliveryCharge", e.target.value)}
                  />
                </div>
              </div>

              <div className="pricing-field">
                <label htmlFor="free-delivery-threshold">Free delivery above</label>
                <div className="input-with-prefix">
                  <span>₹</span>
                  <input
                    id="free-delivery-threshold"
                    type="number"
                    min="0"
                    value={pricing.freeDeliveryThreshold}
                    onChange={(e) =>
                      updateField("freeDeliveryThreshold", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          </section>

          {/* TAX */}
          <section className="pricing-card">
            <div className="pricing-card-header">
              <span className="pricing-card-icon"><FiPercent /></span>
              <div>
                <h3>Tax</h3>
                <p className="pricing-section-hint">
                  GST applied to subtotal + delivery at checkout.
                </p>
              </div>
            </div>

            <div className="pricing-field pricing-field-narrow">
              <label htmlFor="gst-percent">GST</label>
              <div className="input-with-suffix">
                <input
                  id="gst-percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={pricing.gstPercent}
                  onChange={(e) => updateField("gstPercent", e.target.value)}
                />
                <span>%</span>
              </div>
            </div>
          </section>
        </div>

        {/* PREVIEW SIDEBAR */}
        <aside className="pricing-preview">
          <div className="pricing-preview-perf" />
          <h4>Example order</h4>
          <p className="pricing-preview-caption">Size M tee, with back print</p>

          <div className="pricing-preview-row">
            <span>Subtotal</span>
            <span>₹{exampleSubtotal}</span>
          </div>
          <div className="pricing-preview-row">
            <span>Delivery</span>
            <span className={exampleDelivery === 0 ? "pricing-preview-free" : ""}>
              {exampleDelivery === 0 ? "FREE" : `₹${exampleDelivery}`}
            </span>
          </div>
          <div className="pricing-preview-row">
            <span>GST ({pricing.gstPercent}%)</span>
            <span>₹{exampleGst}</span>
          </div>
          <div className="pricing-preview-divider" />
          <div className="pricing-preview-row pricing-preview-total">
            <span>Total</span>
            <span>₹{exampleTotal}</span>
          </div>

          {pricing.freeDeliveryThreshold > 0 && exampleDelivery > 0 && (
            <p className="pricing-preview-note">
              Add ₹{pricing.freeDeliveryThreshold - exampleSubtotal > 0
                ? pricing.freeDeliveryThreshold - exampleSubtotal
                : 0}{" "}
              more to this example order for free delivery.
            </p>
          )}
        </aside>

        {saving && (
          <div className="pricing-saving-overlay">
            <FiLoader className="spin" />
          </div>
        )}
      </div>

      {/* STICKY SAVE BAR */}
      <div className="pricing-save-bar">
        <span className={`pricing-dirty-indicator ${isDirty ? "is-dirty" : ""}`}>
          {isDirty ? "Unsaved changes" : "All changes saved"}
        </span>
        <button
          className="pricing-save-btn"
          onClick={savePricing}
          disabled={saving || !isDirty}
        >
          {saving ? (
            <>
              <FiLoader className="spin" /> Saving…
            </>
          ) : (
            "Save pricing"
          )}
        </button>
      </div>

      {/* TOAST */}
      {toast && (
        <div className={`pricing-toast pricing-toast-${toast.type}`}>
          {toast.type === "success" ? <FiCheckCircle /> : <FiAlertCircle />}
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} aria-label="Dismiss">
            <FiX />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminPricingSettings;