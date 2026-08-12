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
import { useStock, stockDocId } from "../hooks/useStock";

// Same ceiling Customize.jsx enforces when a design is first added —
// kept here too so the cart's +/- stepper can't exceed it either.
const MAX_QUANTITY = 10;

// Formats a number as a rupee amount with two decimal places, so
// floating-point drift from summing prices never reaches the screen.
// Mirrors the identical helper in Checkout.jsx / MyOrders.jsx.
const formatCurrency = (value) => (Number(value) || 0).toFixed(2);

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // popup state
  const [showPopup, setShowPopup] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // Which cart item IDs the user wants to check out. A Set so
  // toggling is O(1) and duplicate ids are naturally impossible.
  // Defaults to "everything selected" once the cart loads, so the
  // page still behaves like before unless the user deselects items.
  const [selectedItems, setSelectedItems] = useState(new Set());

  const uid = localStorage.getItem("uid");
  const navigate = useNavigate();

  // Live stock, so the quantity stepper can be capped the same way
  // Customize.jsx caps it — previously this stepper had NO upper
  // bound at all (not even MAX_QUANTITY), so a user could click +
  // past both real stock and the app's own quantity cap; it only got
  // caught later, server-side, when checkout's transaction rejected
  // the order. Capping it here instead just prevents that dead end.
  const { stockMap } = useStock();

  // Items that predate colorId (or came from a source that doesn't
  // track it, e.g. collection items) aren't stock-tracked — treated
  // as unlimited (up to MAX_QUANTITY), same convention Checkout.jsx
  // and useStock.js use elsewhere.
  const getStockLimit = (item) => {
    if (!item.colorId) return MAX_QUANTITY;

    const id = stockDocId(
      item.colorId,
      item.sizeId || item.size,
      item.neckId || item.neck,
    );
    const entry = stockMap[id];

    if (!entry) return MAX_QUANTITY;
    if (!entry.inStock) return 0;
    return Math.min(entry.quantity, MAX_QUANTITY);
  };

  // Total across the ENTIRE cart (shown as secondary context).
  const total = cartItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0,
  );

  // Total across only the items the user has checked — this is what
  // actually gets sent to checkout.
  const selectedCount = selectedItems.size;
  const allSelected =
    cartItems.length > 0 && selectedCount === cartItems.length;
  const selectedTotal = cartItems
    .filter((item) => selectedItems.has(item.id))
    .reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
      0,
    );

  //  FETCH CART
  useEffect(() => {
    const fetchCart = async () => {
      try {
        setLoading(true);

        if (!uid) return;

        const q = query(collection(db, "cart"), where("uid", "==", uid));

        const snapshot = await getDocs(q);

        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setCartItems(items);
        // Everything starts checked, matching the old "buy everything"
        // behavior by default.
        setSelectedItems(new Set(items.map((item) => item.id)));
      } catch (err) {
        console.log("Cart fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [uid]);

  // Toggle a single item's checkbox.
  const toggleSelectItem = (id) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // "Select All" checkbox — checked selects every current item,
  // unchecked clears the selection entirely.
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(cartItems.map((item) => item.id)));
    }
  };

  //  SAVE TO MY DESIGNS
  // FIX: this used to drop `colorId` and the layout fields
  // (imagePosition/imageSize/textPosition/textSize) when writing the
  // "designs" doc. `colorId` is what ties a line item back to a real
  // stock combo (colorId + size + neck) in useStock.js — losing it
  // here meant that if the design was later moved back to the cart
  // (MyDesigns.jsx's "Move to Cart"), it would silently stop being
  // stock-tracked: no decrement at checkout, no restock on
  // cancellation, no error anywhere to signal it. The layout fields
  // being dropped meant re-editing the design reset the canvas to
  // default positions instead of the user's actual layout. Now this
  // mirrors buildDesignData()'s schema in Customize.jsx.
  const moveToMyDesigns = async (item) => {
    try {
      const designData = {
        uid: item.uid,
        designId: item.designId || null,

        text: item.text,
        side: item.side,

        tshirtColor: item.tshirtColor,
        colorId: item.colorId || null,
        size: item.size,
        textColor: item.textColor || "#000000",
        fontSize: item.fontSize || 18,
        neck: item.neck || "round",

        imageUrl: item.imageUrl || "",
        imagePosition: item.imagePosition || null,
        imageSize: item.imageSize || null,
        textPosition: item.textPosition || null,
        textSize: item.textSize || null,

        price: item.price,
        quantity: item.quantity || 1,

        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "designs"), designData);

      await deleteDoc(doc(db, "cart", item.id));

      setCartItems((prev) => prev.filter((i) => i.id !== item.id));
      setSelectedItems((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    } catch (err) {
      console.log(err);
    }
  };

  //  DELETE FROM CART
  const deleteItem = async () => {
    try {
      await deleteDoc(doc(db, "cart", selectedId));

      setCartItems((prev) => prev.filter((item) => item.id !== selectedId));
      setSelectedItems((prev) => {
        const next = new Set(prev);
        next.delete(selectedId);
        return next;
      });

      setShowPopup(false);
      setSelectedId(null);
    } catch (err) {
      console.log("Delete error:", err);
    }
  };

  const increaseQuantity = async (item) => {
    const limit = getStockLimit(item);
    const current = item.quantity || 1;

    if (current >= limit) return;

    try {
      const newQty = current + 1;

      await updateDoc(doc(db, "cart", item.id), {
        quantity: newQty,
      });

      setCartItems((prev) =>
        prev.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: newQty }
            : cartItem,
        ),
      );
    } catch (error) {
      console.log(error);
    }
  };

  const decreaseQuantity = async (item) => {
    if ((item.quantity || 1) === 1) return;

    try {
      const newQty = item.quantity - 1;

      await updateDoc(doc(db, "cart", item.id), {
        quantity: newQty,
      });

      setCartItems((prev) =>
        prev.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: newQty }
            : cartItem,
        ),
      );
    } catch (error) {
      console.log(error);
    }
  };

  // Only the checked items get sent to checkout — everything else
  // stays behind in the cart untouched.
  const handleCheckout = () => {
    const itemsToCheckout = cartItems.filter((item) =>
      selectedItems.has(item.id),
    );

    if (itemsToCheckout.length === 0) return;

    navigate("/checkout", {
      state: {
        items: itemsToCheckout,
        total: selectedTotal,
      },
    });
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
          <div className="cart-select-all-row">
            <label className="cart-select-all">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
              />
              {allSelected ? "Deselect All" : "Select All"}
            </label>

            <span className="cart-select-count">
              {selectedCount} of {cartItems.length} selected
            </span>
          </div>

          <div className="cart-grid">
            {cartItems.map((item) => {
              const isSelected = selectedItems.has(item.id);
              const limit = getStockLimit(item);
              const atLimit = (item.quantity || 1) >= limit;

              return (
                <div
                  key={item.id}
                  className={`cart-card${isSelected ? " cart-card-selected" : " cart-card-unselected"}`}
                >
                  <label className="cart-item-checkbox">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectItem(item.id)}
                    />
                  </label>

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
                      Print Side: <b>{item.side}</b>
                    </p>

                    <h3 className="cart-price">₹{formatCurrency(item.price)}</h3>
                    <div className="quantity-box">
                      <button onClick={() => decreaseQuantity(item)}>−</button>

                      <span>{item.quantity || 1}</span>

                      <button
                        onClick={() => increaseQuantity(item)}
                        disabled={atLimit}
                        title={atLimit ? "No more stock available" : undefined}
                      >
                        +
                      </button>
                    </div>

                    <h4 className="item-total">
                      Total : ₹
                      {formatCurrency(
                        (item.price || 0) * (item.quantity || 1),
                      )}
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
              );
            })}
          </div>

          {/* Checkout */}
          <div className="checkout-box">
            <h2>Cart Total: ₹{formatCurrency(total)}</h2>
            <p className="checkout-selected-line">
              {selectedCount === 0
                ? "Select at least one item to checkout"
                : `Checking out ${selectedCount} item${selectedCount > 1 ? "s" : ""} • ₹${formatCurrency(selectedTotal)}`}
            </p>

            <button
              className="checkout-btn"
              onClick={handleCheckout}
              disabled={selectedCount === 0}
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

            <button className="confirm-btn" onClick={deleteItem}>
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