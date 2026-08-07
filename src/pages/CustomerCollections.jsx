import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { db } from "../firebase";

import { collection, onSnapshot } from "firebase/firestore";

import "../styles/CustomerCollections.css";

const CustomerCollections = () => {
  const navigate = useNavigate();

  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);

  // Two separate snapshots are still loading until both resolve at
  // least once — tracked independently since they're independent
  // Firestore listeners.
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);

  /*
  ==========================
      FETCH COLLECTIONS
  ==========================
  */

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "collections"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setCollections(data);
        setCollectionsLoading(false);
      },
      (error) => {
        console.log("Collections Error:", error);
        setCollectionsLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  /*
  ==========================
      FETCH PRODUCTS
  ==========================
  */

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProducts(data);
        setProductsLoading(false);
      },
      (error) => {
        console.log("Products Error:", error);
        setProductsLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  /*
  ==========================
      OPEN CUSTOMIZE PAGE
  ==========================
  */
  const customizeProduct = (product) => {
    navigate("/customize", {
      state: {
        product,
        fromCollection: true,
      },
    });
  };

  const viewCollectionProducts = (collectionItem) => {
    navigate(`/collection/${collectionItem.id}`);
  };

  const loading = collectionsLoading || productsLoading;

  if (loading) {
    return <div className="loading-container">Loading collections...</div>;
  }

  return (
    <div className="customer-page">
      <h1>Explore Our Collections</h1>

      <p className="subtitle">Discover beautiful products curated for you</p>

      {collections.length === 0 ? (
        <div className="empty-collections">
          <h3>No Collections Yet</h3>
          <p>Check back soon — new collections are on the way.</p>
        </div>
      ) : (
        <div className="customer-collection-grid">
          {collections.map((collectionItem) => {
            // Computed once per card instead of re-filtering the full
            // products array three separate times in the JSX below.
            const collectionProducts = products.filter(
              (product) => product.collectionId === collectionItem.id,
            );
            const previewProducts = collectionProducts.slice(0, 3);

            return (
              <div className="customer-card" key={collectionItem.id}>
                <img
                  src={collectionItem.image}
                  alt={collectionItem.name}
                  className="collection-image"
                  loading="lazy"
                />

                <div className="customer-content">
                  <h2>{collectionItem.name}</h2>

                  <p>{collectionItem.description}</p>

                  <h3>Products</h3>

                  <div className="customer-products">
                    {previewProducts.length === 0 ? (
                      <p className="no-preview-products">
                        No products in this collection yet.
                      </p>
                    ) : (
                      previewProducts.map((product) => (
                        <div
                          className="customer-product"
                          key={product.id}
                          onClick={() => customizeProduct(product)}
                        >
                          <img
                            src={product.image}
                            alt={product.name}
                            loading="lazy"
                          />

                          <div>
                            <h4>{product.name}</h4>

                            <p>₹{product.price}</p>

                            <p className="desc">{product.description}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {collectionProducts.length > 3 && (
                    <button
                      className="view-products-btn"
                      onClick={() => viewCollectionProducts(collectionItem)}
                    >
                      View All Products ({collectionProducts.length})
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomerCollections;