import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc
} from "firebase/firestore";

import { db } from "../firebase";
import "../styles/MyDesigns.css";

const MyDesigns = () => {

  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDesigns();
  }, []);

  const fetchDesigns = async () => {

    try {

      const uid = localStorage.getItem("uid");

      if (!uid) return;

      const q = query(
        collection(db, "designs"),
        where("uid", "==", uid)
      );

      const querySnapshot =
        await getDocs(q);

      const designsData = [];

      querySnapshot.forEach((docSnap) => {

        designsData.push({
          id: docSnap.id,
          ...docSnap.data()
        });

      });

      setDesigns(designsData);

    } catch (error) {

      console.log(error);

    } finally {

      setLoading(false);

    }

  };

  const deleteDesign = async (id) => {

    try {

      await deleteDoc(
        doc(db, "designs", id)
      );

      setDesigns(
        designs.filter(
          (design) => design.id !== id
        )
      );

    } catch (error) {

      console.log(error);

    }

  };

  if (loading) {
    return (
      <h2 className="loading">
        Loading Designs...
      </h2>
    );
  }

  return (
    <div className="designs-container">

      <h1>🎨 My Designs</h1>

      {designs.length === 0 ? (

        <div className="empty-state">

          <h3>No Designs Found</h3>

          <p>
            Create your first T-Shirt
            design from the Customize Page.
          </p>

        </div>

      ) : (

        <div className="design-grid">

          {designs.map((design) => (

            <div
              key={design.id}
              className="design-card"
            >

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
                    background:
                      design.tshirtColor
                  }}
                ></div>

              )}

              <h3>
                {design.text ||
                  "Custom Design"}
              </h3>

              <p>
                <strong>Neck:</strong>{" "}
                {design.neck}
              </p>

              <p>
                <strong>Side:</strong>{" "}
                {design.side}
              </p>

              <p>
                <strong>Position:</strong>{" "}
                {design.position}
              </p>

              <p className="price">
                ₹{design.price}
              </p>

              <button
                className="delete-btn"
                onClick={() =>
                  deleteDesign(design.id)
                }
              >
                Delete Design
              </button>

            </div>

          ))}

        </div>

      )}

    </div>
  );
};

export default MyDesigns;