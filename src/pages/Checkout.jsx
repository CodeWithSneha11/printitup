import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { useLocation, useNavigate } from "react-router-dom";

import { db, auth } from "../firebase";

import AddAddressModal from "../components/AddAddressModal";
import {
  decrementStockForOrder,
  restockForCancelledOrder,
} from "../hooks/useStock";

import "../styles/Checkout.css";

// Formats a number as a rupee amount with two decimal places, so
// floating-point drift from summing prices (e.g. 199.98999999999998)
// never reaches the screen.
const formatCurrency = (value) => (Number(value) || 0).toFixed(2);

// Fallback pricing used only until the live config loads from Firestore,
// or if that document doesn't exist / fails to load. Kept in sync with
// Customize.jsx's DEFAULT_PRICING so numbers never jump between screens.
// Checkout only needs the checkout-level fields (GST/delivery) — the
// per-item price (base/back-print/image/size) is already baked into
// each cart item's stored `price`.
const DEFAULT_PRICING = {
  gstPercent: 18,
  deliveryCharge: 60,
  freeDeliveryThreshold: 999,
};

const PRICING_DOC_PATH = ["settings", "pricing"]; // db collection, doc id

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const uid = localStorage.getItem("uid");

  // Cart.jsx sends only the items the user checked via
  // navigate("/checkout", { state: { items, total } }). If someone
  // lands on /checkout without that state — direct URL, bookmark, or
  // a page refresh (React Router state doesn't survive a reload) —
  // there's nothing to fall back on except the full cart, so that's
  // the only case where we still fetch everything.
  const passedItems = location.state?.items || null;
  const cameFromSelection = Boolean(passedItems && passedItems.length > 0);

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [message, setMessage] = useState("");

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);

  const [showAddressModal, setShowAddressModal] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState(
    "Cash on Delivery"
  );

  // Admin-configurable GST / delivery, loaded live from Firestore
  // (settings/pricing) — the same document Customize.jsx reads. This is
  // the AUTHORITATIVE calculation: checkout is the last screen before
  // payment, so it recomputes from current settings rather than trusting
  // whatever GST/delivery rate was in effect when each item was added to
  // the cart (which could be stale by the time the user checks out).
  const [pricingConfig, setPricingConfig] = useState(DEFAULT_PRICING);
  const [pricingLoaded, setPricingLoaded] = useState(false);

  useEffect(() => {
    if (cameFromSelection) {
      // Use exactly what the user picked in the cart — no re-fetch,
      // so items they left unchecked never show up here.
      setCartItems(passedItems);
      setLoading(false);
    } else {
      fetchCart();
    }

    fetchSavedAddresses();
    loadPricing();
    // Only ever want this to run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================
  // FETCH PRICING (GST / delivery)
  // ==========================
  // If the document is missing or the read fails, we silently keep
  // DEFAULT_PRICING rather than blocking checkout — pricing should
  // degrade gracefully, not break the order flow.

  const loadPricing = async () => {
    try {
      const snap = await getDoc(doc(db, ...PRICING_DOC_PATH));

      if (snap.exists()) {
        const data = snap.data();

        setPricingConfig({
          gstPercent: Number(data.gstPercent ?? DEFAULT_PRICING.gstPercent),
          deliveryCharge: Number(
            data.deliveryCharge ?? DEFAULT_PRICING.deliveryCharge,
          ),
          freeDeliveryThreshold: Number(
            data.freeDeliveryThreshold ??
              DEFAULT_PRICING.freeDeliveryThreshold,
          ),
        });
      }
    } catch (err) {
      console.warn("Could not load pricing config, using defaults:", err);
    } finally {
      setPricingLoaded(true);
    }
  };

  // ==========================
  // FETCH CART
  // ==========================
  // Fallback path only — used when the page wasn't reached via the
  // cart's "Proceed to Checkout" (no selection state present).

  const fetchCart = async () => {
    try {
      setLoading(true);

      if (!uid) return;

      const q = query(
        collection(db, "cart"),
        where("uid", "==", uid)
      );

      const snapshot = await getDocs(q);

      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setCartItems(items);
    } catch (error) {
      console.error(error);
      setMessage(
        "❌ Couldn't load your cart. Please refresh and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // FETCH SAVED ADDRESSES
  // ==========================

  const fetchSavedAddresses = async () => {
    try {
      if (!uid) return;

      const snapshot = await getDocs(
        collection(
          db,
          "users",
          uid,
          "addresses"
        )
      );

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setSavedAddresses(data);

      const defaultAddress = data.find(
        (item) => item.isDefault
      );

      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
      } else if (data.length > 0) {
        setSelectedAddress(data[0]);
      }
    } catch (error) {
      console.error(error);
      setMessage(
        "❌ Couldn't load your saved addresses. Please refresh and try again.",
      );
    }
  };

  // ==========================
  // SAVE ADDRESS
  // ==========================

  const handleSaveAddress = async (address) => {
    try {
      await addDoc(
        collection(
          db,
          "users",
          uid,
          "addresses"
        ),
        address
      );

      setShowAddressModal(false);

      await fetchSavedAddresses();

      setMessage("Address added successfully.");
    } catch (error) {
      console.error(error);
      setMessage(
        "❌ " + (error.message || "Failed to save address. Please try again."),
      );
    }
  };

  // ==========================
  // ITEM DISPLAY HELPERS
  // ==========================
  // Cart items can come from two different sources:
  //   1) Customize.jsx  -> custom design (isCustom is undefined/true, has `text`, `tshirtColor`, etc.)
  //   2) ShopCollections.jsx -> pre-made product (isCustom: false, has `name`, `color`, etc.)
  // These helpers normalize both shapes for display, instead of relying
  // on a single `productName` field that neither actually has.

  const getItemName = (item) => {
    if (item.isCustom === false) {
      return item.name || "Collection Item";
    }
    return item.text ? `Custom: "${item.text}"` : "Custom T-Shirt Design";
  };

  const getItemImage = (item) => item.imageUrl || item.image || "";

  const getItemMeta = (item) => {
    if (item.isCustom === false) {
      const parts = [];
      if (item.size) parts.push(item.size);
      if (item.colorName) parts.push(item.colorName);
      return parts.join(" • ");
    }

    const parts = [];
    if (item.size) parts.push(item.size);
    if (item.side) parts.push(item.side === "back" ? "Back Print" : "Front Print");
    return parts.join(" • ");
  };

  const getLineTotal = (item) =>
    Number(item.price || 0) * Number(item.quantity || 1);

  // ==========================
  // STOCK LINE ITEMS
  // ==========================
  // Reduces cartItems down to what decrementStockForOrder needs.
  // Only items carrying colorId/size/neck are included — collection
  // items (isCustom: false) don't currently store colorId, so they're
  // skipped rather than crashing the checkout. That means stock isn't
  // tracked for collection items yet; custom designs from Customize.jsx
  // do carry colorId and are covered.

  const getStockItems = (items) =>
    items
      .filter((item) => item.colorId && (item.size || item.sizeId) && (item.neck || item.neckId))
      .map((item) => ({
        colorId: item.colorId,
        sizeId: item.sizeId || item.size,
        neckId: item.neckId || item.neck,
        quantity: Number(item.quantity) || 1,
      }));

  // ==========================
  // PRICING (Subtotal → GST → Delivery → Grand Total)
  // ==========================
  // Always recomputed from cartItems (whichever source populated it)
  // rather than trusting any total passed along, so it can never drift
  // out of sync with what's actually listed below. This is now the
  // single authoritative pricing calculation for the order — Customize.jsx
  // only shows an item subtotal; GST and delivery are decided here.

  const subtotal = cartItems.reduce(
    (sum, item) => sum + getLineTotal(item),
    0
  );

  const gstAmount = Math.round((subtotal * pricingConfig.gstPercent) / 100);

  const deliveryFee =
    pricingConfig.deliveryCharge > 0 &&
    subtotal < pricingConfig.freeDeliveryThreshold
      ? pricingConfig.deliveryCharge
      : 0;

  const amountToFreeDelivery =
    deliveryFee > 0
      ? Math.max(0, pricingConfig.freeDeliveryThreshold - subtotal)
      : 0;

  const grandTotal = subtotal + gstAmount + deliveryFee;

  // ==========================
  // GENERATE SIMPLE ORDER ID
  // ==========================
  // Previously queried the entire "orders" collection filtered only by
  // orderId (no uid filter). Firestore security rules can only permit
  // a *query* when they can prove every possible result satisfies the
  // rule from the query's own where-clauses — and our orders rule
  // requires resource.data.uid == request.auth.uid, which an
  // orderId-only query can never prove. That's what was throwing
  // "Missing or insufficient permissions" here (not a rules bug —
  // loosening the rule to allow this would let any signed-in user
  // read every other user's order, including name/phone/address).
  //
  // Fix: stop needing a read at all. Combine the current timestamp
  // (base36) with a short random suffix — the odds of two orders
  // landing on the exact same millisecond AND the same random suffix
  // are astronomically small, and Firestore's own auto-generated
  // document ID (orderRef.id) is the real uniqueness guarantee this
  // "ORD######" code was never actually providing anyway.
  //
  // Note: this "ORD######" code is a display-only field stored inside
  // the order doc — it is NOT the document's id. Anything that needs
  // to look an order back up (e.g. cancelOrder) must use orderRef.id,
  // never this field.
  const generateOrderId = () => {
    const timestampPart = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `ORD${timestampPart}${randomPart}`;
  };

  // ==========================
  // PLACE ORDER
  // ==========================
  // Order: decrement stock FIRST (inside its own transaction, so
  // concurrent checkouts can't oversell), then create the order doc,
  // then clear the cart.
  //
  // Restock-on-failure only applies if the ORDER ITSELF never got
  // created — tracked separately via orderCreated. Previously this
  // whole flow shared one try/catch, so a failure in the cart-clearing
  // step (after the order had already been successfully written) was
  // treated the same as a fully failed order: it triggered a restock
  // (even though the order was real and still held those units) and
  // showed the customer "Failed to place order" for an order that had
  // actually gone through. Now a cart-clear failure just logs quietly;
  // the order stands and the success message is shown.
  //
  // The order doc now stores the full breakdown (subtotal/gst/delivery)
  // alongside `total`, and `total` is the GRAND total (subtotal + GST +
  // delivery) — previously this only stored the item subtotal, which
  // under-recorded every order by its GST + delivery amount.

  const placeOrder = async () => {
    if (!selectedAddress) {
      setMessage("Please select or add a delivery address.");
      return;
    }

    if (cartItems.length === 0) {
      setMessage("Your cart is empty.");
      return;
    }

    const stockItems = getStockItems(cartItems);
    let stockDecremented = false;
    let orderCreated = false;

    try {
      setPlacingOrder(true);
      setMessage("");

      // Step 1 — reserve stock. Throws (and stops here) if any combo
      // doesn't have enough quantity left.
      if (stockItems.length > 0) {
        await decrementStockForOrder(stockItems);
        stockDecremented = true;
      }

      // Step 2 — create the order.
      const orderId = generateOrderId();
      const orderRef = doc(collection(db, "orders"));

      await setDoc(orderRef, {
        orderId,
        uid,
        customer: {
          name: selectedAddress.fullName,
          phone: selectedAddress.phone,
          email: auth.currentUser?.email || "",
        },
        deliveryAddress: selectedAddress,
        payment: paymentMethod,
        items: cartItems,
        subtotal,
        gst: gstAmount,
        gstPercent: pricingConfig.gstPercent,
        deliveryFee,
        total: grandTotal,
        status: "Pending",
        createdAt: serverTimestamp(),
      });
      orderCreated = true;

      // Step 3 — empty cart (only the items actually part of this
      // order; anything left unchecked in the cart stays there). The
      // order already exists at this point, so a failure here must
      // NOT be treated as a failed order — just log it and move on.
      const deletions = await Promise.allSettled(
        cartItems.map((item) => deleteDoc(doc(db, "cart", item.id))),
      );
      const failedDeletions = deletions.filter((r) => r.status === "rejected");
      if (failedDeletions.length > 0) {
        console.error(
          "Order placed, but some cart items couldn't be cleared:",
          failedDeletions,
        );
      }

      setMessage("✅ Order placed successfully!");

      setTimeout(() => {
        navigate("/my-orders");
      }, 1200);
    } catch (error) {
      console.error(error);

      // Only restock if the ORDER ITSELF failed to be created — if the
      // order exists, those units are legitimately spoken for, however
      // step 3 (cart clearing) went.
      if (stockDecremented && !orderCreated) {
        try {
          await restockForCancelledOrder(stockItems);
        } catch (restockError) {
          console.error("Failed to restock after order error:", restockError);
        }
      }

      setMessage(
        "❌ " + (error.message || "Failed to place order."),
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleAddressKeyDown = (e, address) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelectedAddress(address);
    }
  };

  if (loading) {
    return (
      <div className="checkout-loading">
        Loading Checkout...
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="checkout-loading">
        Please login first.
      </div>
    );
  }
    return (
    <div className="checkout-container">

      <h1>Checkout</h1>

      {!cameFromSelection && cartItems.length > 0 && (
        <div className="checkout-message checkout-fallback-note">
          Showing your entire cart — item selection from the cart page
          wasn't available (this can happen after a page refresh).
        </div>
      )}

      {message && (
        <div className="checkout-message">
          {message}
        </div>
      )}

      {/* =========================
          DELIVERY ADDRESS
      ========================== */}

      <div className="checkout-card">

        <div className="checkout-card-header">

          <h2>Delivery Address</h2>

          <button
            className="add-address-btn"
            onClick={() => setShowAddressModal(true)}
          >
            + Add New Address
          </button>

        </div>

        {savedAddresses.length === 0 ? (

          <div className="no-address">
            <p>Please add your first address.</p>

          </div>

        ) : (

          <div className="saved-address-list">

            {savedAddresses.map((address) => (

              <div
                key={address.id}
                role="button"
                tabIndex={0}
                aria-pressed={selectedAddress?.id === address.id}
                className={
                  selectedAddress?.id === address.id
                    ? "saved-address-card active"
                    : "saved-address-card"
                }
                onClick={() => setSelectedAddress(address)}
                onKeyDown={(e) => handleAddressKeyDown(e, address)}
              >

                <div className="address-top">

                  <strong>{address.label}</strong>

                  {address.isDefault && (
                    <span className="default-badge">
                      Default
                    </span>
                  )}

                </div>

                <h4>{address.fullName}</h4>

                <p>{address.phone}</p>

                <p>
                  {address.house},
                  {" "}
                  {address.area}
                </p>

                <p>
                  {address.city},
                  {" "}
                  {address.state}
                </p>

                <p>{address.pincode}</p>

                {address.landmark && (
                  <p>
                    Landmark :
                    {" "}
                    {address.landmark}
                  </p>
                )}

              </div>

            ))}

          </div>

        )}

      </div>

      {/* =========================
          PAYMENT
      ========================== */}

      <div className="checkout-card">

        <h2>Payment Method</h2>

        <select
          value={paymentMethod}
          onChange={(e) =>
            setPaymentMethod(e.target.value)
          }
        >

          <option>
            Cash on Delivery
          </option>

          {/* <option>
            UPI
          </option>

          <option>
            Credit Card
          </option>

          <option>
            Debit Card
          </option> */}

        </select>

      </div>

      {/* =========================
          ORDER SUMMARY
      ========================== */}

      <div className="checkout-card">

        <h2>Order Summary</h2>

        {cartItems.length === 0 ? (
          <p className="no-address">Your cart is empty.</p>
        ) : (
          cartItems.map((item) => (

            <div
              key={item.id}
              className="checkout-item"
            >

              <div className="checkout-item-left">
                {getItemImage(item) && (
                  <img
                    src={getItemImage(item)}
                    alt={getItemName(item)}
                    className="checkout-item-thumb"
                  />
                )}

                <div>

                  <h4>{getItemName(item)}</h4>

                  {getItemMeta(item) && (
                    <p className="checkout-item-meta">{getItemMeta(item)}</p>
                  )}

                  <p>
                    Qty :
                    {" "}
                    {item.quantity || 1}
                  </p>

                </div>
              </div>

              <strong>

                ₹{formatCurrency(getLineTotal(item))}

              </strong>

            </div>

          ))
        )}

        {cartItems.length > 0 && (
          <>
            <hr />

            {!pricingLoaded && (
              <small className="checkout-pricing-loading">
                Loading current pricing...
              </small>
            )}

            {/* Full, authoritative breakdown — this is the final,
                confirmed pricing before payment. Subtotal carries over
                from the items above; GST and delivery are calculated
                fresh from the current admin-set rates. */}
            <div className="checkout-price-breakdown">
              <div className="checkout-price-row">
                <span>Subtotal</span>
                <span>₹{formatCurrency(subtotal)}</span>
              </div>

              <div className="checkout-price-row">
                <span>GST ({pricingConfig.gstPercent}%)</span>
                <span>₹{formatCurrency(gstAmount)}</span>
              </div>

              <div className="checkout-price-row">
                <span>Delivery</span>
                <span className={deliveryFee === 0 ? "checkout-price-free" : ""}>
                  {deliveryFee === 0 ? "FREE" : `₹${formatCurrency(deliveryFee)}`}
                </span>
              </div>
            </div>

            {deliveryFee > 0 && amountToFreeDelivery > 0 && (
              <p className="checkout-free-delivery-hint">
                Add ₹{formatCurrency(amountToFreeDelivery)} more to get FREE delivery 🚚
              </p>
            )}
          </>
        )}

        <hr />

        <div className="checkout-total">

          <h3>Total</h3>

          <h2>₹{formatCurrency(grandTotal)}</h2>

        </div>

        <small className="checkout-gst-note">Inclusive of all taxes</small>

      </div>

      {/* =========================
          PLACE ORDER
      ========================== */}

      <button
        className="place-order-btn"
        disabled={
          placingOrder ||
          cartItems.length === 0
        }
        onClick={placeOrder}
      >

        {placingOrder
          ? "Placing Order..."
          : "Place Order"}

      </button>

      {/* =========================
          ADDRESS MODAL
      ========================== */}

      {showAddressModal && (

        <AddAddressModal
          onClose={() =>
            setShowAddressModal(false)
          }
          onSave={handleSaveAddress}
        />

      )}

    </div>
  );
};

export default Checkout;