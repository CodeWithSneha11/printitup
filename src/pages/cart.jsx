import React, { useEffect, useState } from "react";
import "../styles/Cart.css";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // popup state
  const [showPopup, setShowPopup] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const uid = localStorage.getItem("uid");
const navigate = useNavigate();
const total = cartItems.reduce(
  (sum, item) =>
    sum + Number(item.price || 0) * Number(item.quantity || 1),
  0
);

  //  FETCH CART
  useEffect(() => {
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
      } catch (err) {
        console.log("Cart fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [uid]);

  //  SAVE TO MY DESIGNS
const moveToMyDesigns = async (item) => {

  try {

    const designData = {
      uid: item.uid,
      text: item.text,
      position: item.position,
      side: item.side,
      tshirtColor: item.tshirtColor,
      size: item.size,
      textColor: item.textColor || "#000000",
      fontSize: item.fontSize || 18,
      neck: item.neck || "round",
      imageUrl: item.imageUrl || "",
      price: item.price,
      quantity: item.quantity || 1,
      createdAt: serverTimestamp(),
    };

    if (item.designId) {
      designData.designId = item.designId;
    }

    await addDoc(
      collection(db, "designs"),
      designData
    );

    await deleteDoc(
      doc(db, "cart", item.id)
    );

    setCartItems(prev =>
      prev.filter(i => i.id !== item.id)
    );

  } catch (err) {

    console.log(err);

  }

};

  //  DELETE FROM CART
  const deleteItem = async () => {
    try {
      await deleteDoc(doc(db, "cart", selectedId));

      setCartItems((prev) =>
        prev.filter((item) => item.id !== selectedId)
      );

      setShowPopup(false);
      setSelectedId(null);
    } catch (err) {
      console.log("Delete error:", err);
    }
  };

const increaseQuantity = async (item) => {

  try {

    const newQty = (item.quantity || 1) + 1;

    await updateDoc(
      doc(db, "cart", item.id),
      {
        quantity: newQty,
      }
    );

    setCartItems((prev) =>
      prev.map((cartItem) =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: newQty }
          : cartItem
      )
    );

  } catch (error) {

    console.log(error);

  }

};

const decreaseQuantity = async (item) => {

  if ((item.quantity || 1) === 1) return;

  try {

    const newQty = item.quantity - 1;

    await updateDoc(
      doc(db, "cart", item.id),
      {
        quantity: newQty,
      }
    );

    setCartItems((prev) =>
      prev.map((cartItem) =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: newQty }
          : cartItem
      )
    );

  } catch (error) {

    console.log(error);

  }

};
return (
  <div className="cart-container">
    <h1 className="cart-title">🛒 My Cart</h1>

    {/* NOT LOGGED IN */}
    {!uid ? (
      <div className="cart-center">
        <h2>Please login to view your cart</h2>
      </div>
    ) : loading ? (
      /* LOADING */
      <div className="cart-center">
        <h2>⏳ Loading cart...</h2>
      </div>
    ) : cartItems.length === 0 ? (
      /* EMPTY */
      <div className="cart-center">
        <h3>Your cart is empty</h3>
      </div>
    ) : (
      <>
        <div className="cart-grid">
          {cartItems.map((item) => (
            <div key={item.id} className="cart-card">
              {/* IMAGE */}
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt="design"
                  className="cart-image"
                />
              ) : (
                <div className="cart-no-image">No Image</div>
              )}

              <div className="cart-details">
                <h3>{item.text || "Custom Design"}</h3>

                <p>
                  Color: <b>{item.tshirtColor}</b>
                </p>

                <p>
                  Size: <b>{item.size}</b>
                </p>

                <p>
                  Position: <b>{item.position}</b>
                </p>

                <p>
                  Side: <b>{item.side}</b>
                </p>

                <h3 className="cart-price">₹{item.price}</h3>
                <div className="quantity-box">

  <button
    onClick={() => decreaseQuantity(item)}
  >
    −
  </button>

  <span>
    {item.quantity || 1}
  </span>

  <button
    onClick={() => increaseQuantity(item)}
  >
    +
  </button>

</div>

<h4 className="item-total">

  Total : ₹
  {(item.price || 0) * (item.quantity || 1)}

</h4>

                <button
                  className="remove-btn"
                  onClick={() => {
                    setSelectedId(item.id);
                    setShowPopup(true);
                  }}
                >
                  Remove
                </button>

                <button
                  className="save-btn"
                  onClick={() => moveToMyDesigns(item)}
                >
                  Save to My Designs
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout */}
        <div className="checkout-box">
          <h2>Total: ₹{total}</h2>

          <button
            className="checkout-btn"
            onClick={() => navigate("/checkout")}
          >
            Proceed to Checkout
          </button>
        </div>
      </>
    )}

    {/* POPUP */}
    {showPopup && (
      <div className="overlay">
        <div className="popup">
          <h3>Remove Item?</h3>

          <button
            className="confirm-btn"
            onClick={deleteItem}
          >
            Yes Remove
          </button>

          <button
            className="cancel-btn"
            onClick={() => {
              setShowPopup(false);
              setSelectedId(null);
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )}
  </div>
);
};

export default Cart;
