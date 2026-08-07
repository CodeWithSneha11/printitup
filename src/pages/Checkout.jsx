import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { useLocation, useNavigate } from "react-router-dom";

import { db, auth } from "../firebase";

import AddAddressModal from "../components/AddAddressModal";

import "../styles/Checkout.css";

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
    // Only ever want this to run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      console.log(error);
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
      console.log(error);
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
      console.log(error);
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
  // TOTAL
  // ==========================
  // Always recomputed from cartItems (whichever source populated it)
  // rather than trusting the total Cart.jsx passed along, so it can
  // never drift out of sync with what's actually listed below.

  const total = cartItems.reduce(
    (sum, item) => sum + getLineTotal(item),
    0
  );

  // ==========================
  // PLACE ORDER
  // ==========================
// ==========================
// GENERATE SIMPLE ORDER ID
// ==========================

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
  const generateOrderId = () => {
    const timestampPart = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `ORD${timestampPart}${randomPart}`;
  };
  // ==========================
// PLACE ORDER
// ==========================

const placeOrder = async () => {
  if (!selectedAddress) {
    setMessage("Please select or add a delivery address.");
    return;
  }

  if (cartItems.length === 0) {
    setMessage("Your cart is empty.");
    return;
  }

  try {
    setPlacingOrder(true);
    setMessage("");

    // Generate a simple order number
    const orderId = generateOrderId();

    // Firestore document reference
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

      total,

      status: "Pending",

      createdAt: serverTimestamp(),
    });

    // Empty Cart — only removes the items that were actually part of
    // this order (cartItems is either the user's selection or, in the
    // fallback path, the whole cart), so anything left unchecked in
    // the cart stays there untouched.
    for (const item of cartItems) {
      await deleteDoc(doc(db, "cart", item.id));
    }

    setMessage("✅ Order placed successfully!");

    setTimeout(() => {
      navigate("/my-orders");
    }, 1200);
  } catch (error) {
    console.error(error);
    setMessage("❌ Failed to place order.");
  } finally {
    setPlacingOrder(false);
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
                className={
                  selectedAddress?.id === address.id
                    ? "saved-address-card active"
                    : "saved-address-card"
                }
                onClick={() => setSelectedAddress(address)}
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

                ₹{getLineTotal(item)}

              </strong>

            </div>

          ))
        )}

        <hr />

        <div className="checkout-total">

          <h3>Total</h3>

          <h2>₹{total}</h2>

        </div>

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