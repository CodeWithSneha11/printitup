import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { db } from "../firebase";

import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";

import "../styles/CustomerCollectionProducts.css";

const CustomerCollectionProducts = () => {
  const { id } = useParams();

  const navigate = useNavigate();

  const [collectionData, setCollectionData] = useState(null);

  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);

  /*
  ==========================
      FETCH COLLECTION
  ==========================
  */

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const docRef = doc(db, "collections", id);

        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setCollectionData({
            id: docSnap.id,

            ...docSnap.data(),
          });
        }
      } catch (error) {
        console.log("Collection Error:", error);
      }
    };

    fetchCollection();
  }, [id]);

  /*
  ==========================
      FETCH PRODUCTS
  ==========================
  */

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "products"),

      (snapshot) => {
        const productData = snapshot.docs

          .map((doc) => ({
            id: doc.id,

            ...doc.data(),
          }))

          .filter((product) => product.collectionId === id);

        setProducts(productData);

        setLoading(false);
      },

      (error) => {
        console.log("Products Error:", error);

        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [id]);

  /*
  ==========================
      OPEN CUSTOMIZE PAGE
  ==========================
  */

  const customizeProduct = (product) => {
    if (product.stock === 0) {
      return;
    }

    navigate(
      "/customize",

      {
        state: {
          product,

          fromCollection: true,
        },
      },
    );
  };

  /*
  ==========================
      LOADING
  ==========================
  */

  if (loading) {
    return <div className="loading-container">Loading products...</div>;
  }

  /*
  ==========================
      COLLECTION NOT FOUND
  ==========================
  */

  if (!collectionData) {
    return (
      <div className="empty-products">
        <h3>Collection Not Found</h3>

        <p>The collection you are looking for does not exist.</p>
      </div>
    );
  }

  return (
    <div className="collection-products-page">
      {/* ==========================
          HERO SECTION
      =========================== */}

      <section className="collection-hero">
        <button className="back-btn" onClick={() => navigate("/collections")}>
          ← Back to Collections
        </button>

        <div className="collection-hero-content">
          <div className="collection-hero-image">
            <img
              src={collectionData.image}
              alt={collectionData.name}
              loading="lazy"
            />
          </div>

          <div className="collection-hero-info">
            <span className="collection-badge">Collection</span>

            <h1>{collectionData.name}</h1>

            <p>{collectionData.description}</p>

            <div className="collection-stats">
              <div className="stat-card">
                <h3>{products.length}</h3>

                <span>Products</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================
          PRODUCTS SECTION
      =========================== */}

      <section className="products-section">
        <h2>Products</h2>

        {products.length === 0 ? (
          <div className="empty-products">
            <h3>No Products Available</h3>

            <p>This collection does not have any products yet.</p>
          </div>
        ) : (
          <div className="products-grid">
            {products.map((product) => (
              <div
                key={product.id}
                className={`product-card ${
                  product.stock === 0 ? "out-of-stock" : ""
                }`}
                onClick={() => customizeProduct(product)}
              >
                <img src={product.image} alt={product.name} loading="lazy" />

                <div className="product-card-content">
                  <h3>{product.name}</h3>

                  <p className="price">₹{product.price}</p>

                  <p className="description">{product.description}</p>

                  {product.stock === 0 && (
                    <span className="stock-label">Out of Stock</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CustomerCollectionProducts;
