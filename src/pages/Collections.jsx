import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import "../styles/Collections.css";

const Collections = () => {

  const [showPopup, setShowPopup] = useState(false);

  const [collections, setCollections] = useState([]);

  const [name, setName] = useState("");

  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);

  // ==========================
  // Fetch Collections
  // ==========================

  const fetchCollections = async () => {

    try {

      const snapshot = await getDocs(
        collection(db, "collections")
      );

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setCollections(data);

    } catch (error) {

      console.log(error);

    }

  };

  useEffect(() => {

    fetchCollections();

  }, []);

  // ==========================
  // Save Collection
  // ==========================

  const saveCollection = async () => {

    if (!name.trim()) {

      alert("Collection name is required.");

      return;

    }

    try {

      setSaving(true);

      await addDoc(
        collection(db, "collections"),
        {
          name,
          description,
          imageUrl: "",
          createdAt: serverTimestamp(),
        }
      );

      alert("Collection Added Successfully!");

      setName("");

      setDescription("");

      setShowPopup(false);

      fetchCollections();

    } catch (error) {

      console.log(error);

      alert("Unable to save collection.");

    } finally {

      setSaving(false);

    }

  };

  return (

    <div className="admin-content">

      <div className="collections-header">

        <div>

          <h1>Collections</h1>

          <p>Manage your T-shirt collections</p>

        </div>

        <button
          className="add-btn"
          onClick={() => setShowPopup(true)}
        >
          + Add Collection
        </button>

      </div>

      {/* Collection Cards */}

      <div className="collections-grid">

        {collections.length === 0 ? (

          <div className="collections-card">

            <h3>No Collections Found</h3>

          </div>

        ) : (

          collections.map((item) => (

            <div
              className="collection-card"
              key={item.id}
            >

              {item.imageUrl ? (

                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="collection-image"
                />

              ) : (

                <div className="collection-image no-image">

                  No Image

                </div>

              )}

              <div className="collection-info">

                <h2>{item.name}</h2>

                <p>{item.description}</p>

              </div>

            </div>

          ))

        )}

      </div>

      {/* Popup */}

      {showPopup && (

        <div className="popup-overlay">

          <div className="collection-popup">

            <div className="popup-header">

              <h2>Add Collection</h2>

              <button
                className="close-btn"
                onClick={() => setShowPopup(false)}
              >
                ✕
              </button>

            </div>

            <div className="popup-body">

              <label>Collection Name</label>

              <input
                type="text"
                placeholder="Enter collection name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <label>Description</label>

              <textarea
                rows="4"
                placeholder="Write description..."
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
              />

            </div>

            <div className="popup-footer">

              <button
                className="cancel-btn"
                onClick={() => setShowPopup(false)}
              >
                Cancel
              </button>

              <button
                className="save-btn"
                onClick={saveCollection}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Collection"}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};

export default Collections;