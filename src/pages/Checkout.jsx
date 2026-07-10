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

import { db, auth } from "../firebase";

import AddAddressModal from "../components/AddAddressModal";

import "../styles/Checkout.css";

const Checkout = () => {
  const navigate = useNavigate();

  const uid = localStorage.getItem("uid");

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
    fetchCart();
    fetchSavedAddresses();
  }, []);

  // ==========================
  // FETCH CART
  // ==========================

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
  // TOTAL
  // ==========================

  const total = cartItems.reduce(
    (sum, item) => sum + Number(item.price || 0),
    0
  );

  // ==========================
  // PLACE ORDER
  // ==========================

  const placeOrder = async () => {
    if (!selectedAddress) {
      setMessage(
        "Please select or add a delivery address."
      );
      return;
    }

    try {
      setPlacingOrder(true);

      setMessage("");

      await addDoc(
        collection(db, "orders"),
        {
          uid,

          customer: {
            name: selectedAddress.fullName,
            phone: selectedAddress.phone,
            email:
              auth.currentUser?.email || "",
          },

          deliveryAddress: selectedAddress,

          payment: paymentMethod,

          items: cartItems,

          total,

          status: "Pending",

          createdAt: serverTimestamp(),
        }
      );

      // Empty Cart

      for (const item of cartItems) {
        await deleteDoc(
          doc(db, "cart", item.id)
        );
      }

      setMessage(
        "✅ Order placed successfully!"
      );

      setTimeout(() => {
        navigate("/my-orders");
      }, 1200);
    } catch (error) {
      console.log(error);

      setMessage(
        "❌ Failed to place order."
      );
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

          <option>
            UPI
          </option>

          <option>
            Credit Card
          </option>

          <option>
            Debit Card
          </option>

        </select>

      </div>

      {/* =========================
          ORDER SUMMARY
      ========================== */}

      <div className="checkout-card">

        <h2>Order Summary</h2>

        {cartItems.map((item) => (

          <div
            key={item.id}
            className="checkout-item"
          >

            <div>

              <h4>{item.productName}</h4>

              <p>
                Qty :
                {" "}
                {item.quantity || 1}
              </p>

            </div>

            <strong>

              ₹{item.price}

            </strong>

          </div>

        ))}

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