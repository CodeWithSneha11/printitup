import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase";
import "../styles/MyDesigns.css";

const MyDesigns = () => {
  const navigate = useNavigate();
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  // Per-design "moving..." state so the button that was clicked shows
  // its own busy state instead of them all reacting together.
  const [movingId, setMovingId] = useState(null);

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
  // FIX: this used to copy only a hand-picked subset of the design's
  // fields into the cart doc — missing `colorId` and the layout
  // fields (imagePosition/imageSize/textPosition/textSize), and
  // missing `quantity` entirely.
  //
  // `colorId` is what Checkout.jsx's getStockItems() (and useStock.js's
  // decrementStockForOrder/cancelOrder) use to match a cart/order line
  // back to a physical stock combo (colorId + size + neck). Without it,
  // any design moved through this button would silently stop being
  // stock-tracked forever after — no error, stock just never
  // decrements/restocks for it again. Same idea for the layout fields:
  // dropping them meant re-opening the design in Customize.jsx reset
  // the canvas to default positions instead of what the user actually
  // laid out.
  //
  // Now this mirrors buildDesignData()'s schema in Customize.jsx (and
  // Cart.jsx's moveToMyDesigns, see the matching fix there) so a
  // design can round-trip between "cart" and "designs" any number of
  // times without losing data.
  const moveToCart = async (design) => {
    setMovingId(design.id);
    try {
      await addDoc(collection(db, "cart"), {
        uid: design.uid,
        designId: design.designId || null,

        text: design.text || "",
        side: design.side || "front",

        tshirtColor: design.tshirtColor || "#ffffff",
        colorId: design.colorId || null,
        size: design.size || "M",
        textColor: design.textColor || "#000000",
        fontSize: Number(design.fontSize) || 18,
        neck: design.neck || "round",

        imageUrl: design.imageUrl || "",
        imagePosition: design.imagePosition || null,
        imageSize: design.imageSize || null,
        textPosition: design.textPosition || null,
        textSize: design.textSize || null,

        price: design.price || 499,
        quantity: 1,

        createdAt: serverTimestamp(),
      });

      await deleteDoc(doc(db, "designs", design.id));
    } catch (error) {
      console.error(error);
      alert("Failed to move design.");
    } finally {
      setMovingId(null);
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
                <strong>Size:</strong> {design.size}
              </p>

              <p className="price">₹{design.price}</p>

              <button
                className="cart-btn"
                onClick={() => moveToCart(design)}
                disabled={movingId === design.id}
              >
                {movingId === design.id ? "Moving..." : " Move to Cart"}
              </button>

              <button
                className="edit-btn"
                onClick={() =>
                  navigate("/customize", {
                    state: {
                      design,
                      editMode: true,
                    },
                  })
                }
              >
                 Edit Design
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