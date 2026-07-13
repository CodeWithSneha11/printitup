import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  addDoc,
} from "firebase/firestore";

import { db } from "../firebase";
import "../styles/MyDesigns.css";

const MyDesigns = () => {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
const [selectedId, setSelectedId] = useState(null);

  const uid = localStorage.getItem("uid");

  // ===============================
  // LIVE FIRESTORE LISTENER
  // ===============================
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, "designs"), where("uid", "==", uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setDesigns(data);
        setLoading(false);
      },
      (error) => {
        console.log(error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [uid]);

  // ===============================
  // DELETE DESIGN
  // ===============================
const deleteDesign = async () => {
  try {
    await deleteDoc(doc(db, "designs", selectedId));

    setDesigns((prev) =>
      prev.filter((design) => design.id !== selectedId)
    );

    setShowPopup(false);
    setSelectedId(null);
  } catch (error) {
    console.log(error);
  }
};
  // ===============================
  // MOVE TO CART
  // ===============================
  const moveToCart = async (design) => {
    try {
      await addDoc(collection(db, "cart"), {
        uid: design.uid,

        text: design.text || "",

        position: design.position || "center",

        side: design.side || "front",

        tshirtColor: design.tshirtColor || "#ffffff",

        size: design.size || "M",

        textColor: design.textColor || "#000000",

        fontSize: Number(design.fontSize) || 18,

        neck: design.neck || "round",

        imageUrl: design.imageUrl || "",

        price: design.price || 499,

        createdAt: new Date(),
      });

      await deleteDoc(doc(db, "designs", design.id));

    } catch (error) {
      console.error(error);
      alert("Failed to move design.");
    }
  };

  // ===============================
  // LOADING
  // ===============================
  if (loading) {
    return <h2 className="loading">Loading Designs...</h2>;
  }

  return (
    <div className="designs-container">
      <h1> My Designs</h1>

      {designs.length === 0 ? (
        <div className="empty-state">
          <h3>No Designs Found</h3>

          <p>Create your first T-Shirt design from the Customize Page.</p>
        </div>
      ) : (
        <div className="design-grid">
          {designs.map((design) => (
            <div key={design.id} className="design-card">
              {design.imageUrl ? (
                <img
                  src={design.imageUrl}
                  alt="Design"
                  className="design-preview"
                />
              ) : (
                <div
                  className="color-preview"
                  style={{
                    background: design.tshirtColor,
                  }}
                ></div>
              )}

              <h3>{design.text || "Custom Design"}</h3>

              <p>
                <strong>Color:</strong> {design.tshirtColor}
              </p>

              <p>
                <strong>Neck:</strong> {design.neck}
              </p>

              <p>
                <strong>Side:</strong> {design.side}
              </p>

              <p>
                <strong>Position:</strong> {design.position}
              </p>

              <p>
                <strong>Size:</strong> {design.size}
              </p>

              <p className="price">₹{design.price}</p>

              <button className="cart-btn" onClick={() => moveToCart(design)}>
                 Move to Cart
              </button>

              <button
  className="delete-btn"
  onClick={() => {
    setSelectedId(design.id);
    setShowPopup(true);
  }}
>
   Delete Design
</button>
            </div>
          ))}
        </div>
      )}
      {showPopup && (
  <div className="popup-overlay">
    <div className="popup-box">
      <h3>Delete Design?</h3>

      <p>This action cannot be undone.</p>

      <div className="popup-buttons">
        <button
          className="confirm-btn"
          onClick={deleteDesign}
        >
          Delete
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
  </div>
)}
    </div>
  );
};

export default MyDesigns;
