import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { db } from "../firebase";

import { collection, onSnapshot } from "firebase/firestore";

import "../styles/CustomerCollections.css";

const CustomerCollections = () => {
  const navigate = useNavigate();

  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);

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
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setProducts(data);
    });

    return () => unsubscribe();
  }, []);

  /*
  ==========================
      ADD PRODUCT TO CART
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
  return (
    <div className="customer-page">
      <h1>Explore Our Collections</h1>

      <p className="subtitle">Discover beautiful products curated for you</p>

      <div className="customer-collection-grid">
        {collections.map((collectionItem) => (
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
                {products
                  .filter(
                    (product) => product.collectionId === collectionItem.id,
                  )
                  .slice(0, 3)
                  .map((product) => (
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
                  ))}
              </div>

              {products.filter(
                (product) => product.collectionId === collectionItem.id,
              ).length > 3 && (
                <button
                  className="view-products-btn"
                  onClick={() => viewCollectionProducts(collectionItem)}
                >
                  View All Products (
                  {
                    products.filter(
                      (product) => product.collectionId === collectionItem.id,
                    ).length
                  }
                  )
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerCollections;