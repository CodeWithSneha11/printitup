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
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import "../styles/Checkout.css";

const Checkout = () => {
  const navigate = useNavigate();
  const uid = localStorage.getItem("uid");

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    payment: "Cash on Delivery",
  });

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      setLoading(true);

      if (!uid) {
        setLoading(false);
        return;
      }

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

  const total = cartItems.reduce(
    (sum, item) => sum + Number(item.price || 0),
    0
  );

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = () => {
    if (
      !form.name.trim() ||
      !form.phone.trim() ||
      !form.address.trim() ||
      !form.city.trim() ||
      !form.state.trim() ||
      !form.pincode.trim()
    ) {
      setMessage("Please fill all required fields.");
      return false;
    }

    if (!/^[0-9]{10}$/.test(form.phone)) {
      setMessage("Phone number must contain 10 digits.");
      return false;
    }

    if (!/^[0-9]{6}$/.test(form.pincode)) {
      setMessage("Pincode must contain 6 digits.");
      return false;
    }

    if (
      form.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    ) {
      setMessage("Please enter a valid email address.");
      return false;
    }

    return true;
  };

  const placeOrder = async () => {
    if (!validateForm()) return;

    try {
      setPlacingOrder(true);
      setMessage("");

      await addDoc(collection(db, "orders"), {
        uid,
        customer: form,
        items: cartItems,
        total,
        status: "Pending",
        createdAt: serverTimestamp(),
      });

      // Delete all cart items
      for (const item of cartItems) {
        await deleteDoc(doc(db, "cart", item.id));
      }

      setMessage("✅ Order placed successfully!");

      setTimeout(() => {
        navigate("/");
      }, 1500);

    } catch (error) {
      console.log(error);
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
        Please login to continue.
      </div>
    );
  }
  return (
  <div className="checkout-container">
    <h1>Secure Checkout</h1>

    <div className="checkout-grid">

      {/* ===========================
            DELIVERY FORM
      =========================== */}

      <div className="checkout-form">

        <h2>📦 Delivery Details</h2>

        {message && (
          <div className="checkout-message">
            {message}
          </div>
        )}

        <label>
          Full Name <span>*</span>
        </label>

        <input
          type="text"
          name="name"
          placeholder="Enter your full name"
          value={form.name}
          onChange={handleChange}
        />

        <div className="form-row">

          <div>

            <label>
              Phone Number <span>*</span>
            </label>

            <input
              type="tel"
              name="phone"
              placeholder="9876543210"
              value={form.phone}
              onChange={handleChange}
            />

          </div>

          <div>

            <label>Email Address</label>

            <input
              type="email"
              name="email"
              placeholder="example@gmail.com"
              value={form.email}
              onChange={handleChange}
            />

          </div>

        </div>

        <label>
          Delivery Address <span>*</span>
        </label>

        <textarea
          name="address"
          placeholder="House No, Street, Landmark..."
          value={form.address}
          onChange={handleChange}
        />

        <div className="form-row">

          <div>

            <label>
              City <span>*</span>
            </label>

            <input
              type="text"
              name="city"
              placeholder="Ahmedabad"
              value={form.city}
              onChange={handleChange}
            />

          </div>

          <div>

            <label>
              State <span>*</span>
            </label>

            <input
              type="text"
              name="state"
              placeholder="Gujarat"
              value={form.state}
              onChange={handleChange}
            />

          </div>

        </div>

        <div className="form-row">

          <div>

            <label>
              Pincode <span>*</span>
            </label>

            <input
              type="text"
              name="pincode"
              placeholder="380001"
              value={form.pincode}
              onChange={handleChange}
            />

          </div>

          <div>

            <label>Payment Method</label>

            <select
              name="payment"
              value={form.payment}
              onChange={handleChange}
            >
              <option>Cash on Delivery</option>
              <option>UPI</option>
              <option>Credit Card</option>
              <option>Debit Card</option>
            </select>

          </div>

        </div>

      </div>

      {/* ===========================
            ORDER SUMMARY
      =========================== */}

      <div className="order-summary">

        <h2>🧾 Order Summary</h2>

        {cartItems.map((item) => (

          <div
            className="summary-item"
            key={item.id}
          >

            <div className="summary-left">

              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt="Design"
                />
              ) : (
                <div className="summary-placeholder">
                  No Image
                </div>
              )}

              <div>

                <h4>
                  {item.text || "Custom T-Shirt"}
                </h4>

                <p>
                  Size : {item.size}
                </p>

                <p>
                  Color : {item.tshirtColor}
                </p>

                <p>
                  {item.side} • {item.position}
                </p>

              </div>

            </div>

            <strong>
              ₹{item.price}
            </strong>

          </div>

        ))}

        <hr />

        <div className="total-row">

          <h3>Total</h3>

          <h2>
            ₹{total}
          </h2>

        </div>

        <button
          className="place-order-btn"
          onClick={placeOrder}
          disabled={placingOrder}
        >
          {placingOrder
            ? "Placing Order..."
            : "Place Order"}
        </button>

      </div>

    </div>
      </div>
  );
};

export default Checkout;