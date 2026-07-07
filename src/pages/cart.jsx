import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // popup state
  const [showPopup, setShowPopup] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const uid = localStorage.getItem("uid");

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
      await addDoc(collection(db, "designs"), {
        uid,
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
        createdAt: new Date(),
      });

      await deleteDoc(doc(db, "cart", item.id));

      setCartItems((prev) =>
        prev.filter((i) => i.id !== item.id)
      );

    
    } catch (err) {
      console.log("Move error:", err);
    }
  };

  // 🗑 DELETE FROM CART
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

  // NOT LOGGED IN
  if (!uid) {
    return (
      <div style={styles.center}>
        <h2> Please login to view your cart</h2>
      </div>
    );
  }

  // ⏳ LOADING
  if (loading) {
    return (
      <div style={styles.center}>
        <h2>⏳ Loading cart...</h2>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🛒 My Cart</h1>

      {/* EMPTY */}
      {cartItems.length === 0 ? (
        <div style={styles.center}>
          <h3>Your cart is empty </h3>
        </div>
      ) : (
        <div style={styles.grid}>
          {cartItems.map((item) => (
            <div key={item.id} style={styles.card}>

              {/* IMAGE */}
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt="design"
                  style={styles.image}
                />
              ) : (
                <div style={styles.noImage}>No Image</div>
              )}

              {/* DETAILS */}
              <h3>{item.text || "Custom Design"}</h3>

              <p> Color: <b>{item.tshirtColor}</b></p>
              <p> Size: <b>{item.size}</b></p>
              <p> Position: <b>{item.position}</b></p>
              <p> Side: <b>{item.side}</b></p>

              <h3 style={styles.price}> ₹{item.price}</h3>

              {/* 🗑 REMOVE */}
              <button
                onClick={() => {
                  setSelectedId(item.id);
                  setShowPopup(true);
                }}
                style={styles.removeBtn}
              >
                Remove 
              </button>

              {/* SAVE TO MY DESIGNS */}
              <button
                onClick={() => moveToMyDesigns(item)}
                style={styles.saveBtn}
              >
                 Save to My Designs
              </button>

            </div>
          ))}
        </div>
      )}

      {/* POPUP */}
      {showPopup && (
        <div style={styles.overlay}>
          <div style={styles.popup}>
            <h3>Remove Item?</h3>

            <button onClick={deleteItem} style={styles.confirmBtn}>
               Yes Remove
            </button>

            <button
              onClick={() => {
                setShowPopup(false);
                setSelectedId(null);
              }}
              style={styles.cancelBtn}
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

/* =======================
        STYLES
======================= */

const styles = {
  container: {
    padding: "30px",
    fontFamily: "Poppins, sans-serif",
    background: "#f8fafc",
    minHeight: "100vh",
  },

  title: {
    textAlign: "center",
    marginBottom: "20px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "20px",
    marginTop: "20px",
  },

  card: {
    background: "#fff",
    padding: "15px",
    borderRadius: "15px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
  },

  image: {
    width: "100%",
    height: "180px",
    objectFit: "contain",
    borderRadius: "10px",
    marginBottom: "10px",
    background: "#f3f4f6",
  },

  noImage: {
    height: "180px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f3f4f6",
    borderRadius: "10px",
    marginBottom: "10px",
    color: "#6b7280",
  },

  price: {
    marginTop: "10px",
    color: "#16a34a",
  },

  removeBtn: {
    marginTop: "10px",
    padding: "8px",
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    width: "100%",
    fontWeight: "600",
    cursor: "pointer",
  },

  saveBtn: {
    marginTop: "10px",
    padding: "8px",
    background: "#f97316",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    width: "100%",
    fontWeight: "600",
    cursor: "pointer",
  },

  center: {
    height: "60vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  popup: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    width: "280px",
    textAlign: "center",
  },

  confirmBtn: {
    marginTop: "10px",
    width: "100%",
    padding: "10px",
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
  },

  cancelBtn: {
    marginTop: "10px",
    width: "100%",
    padding: "10px",
    background: "#e5e7eb",
    border: "none",
    borderRadius: "8px",
  },
};