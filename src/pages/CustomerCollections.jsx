import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { db, auth } from "../firebase";

import {
  collection,
  onSnapshot,
} from "firebase/firestore";

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
      }
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
      }
    );

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


  return (
    <div className="customer-page">
      <h1>Explore Our Collections</h1>

      <p className="subtitle">
        Discover beautiful products curated for you
      </p>

      <div className="customer-collection-grid">
        {collections.map((collectionItem) => (
          <div className="customer-card" key={collectionItem.id}>
            <img
              src={collectionItem.image}
              alt={collectionItem.name}
              className="collection-image"
            />

            <div className="customer-content">
              <h2>{collectionItem.name}</h2>

              <p>{collectionItem.description}</p>

              <h3>Products</h3>

              <div className="customer-products">
                {products
                  .filter(
                    (product) =>
                      product.collectionId === collectionItem.id
                  )
                  .map((product) => (
                    <div
                      className="customer-product"
                      key={product.id}
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                      />

                      <div>
                        <h4>{product.name}</h4>

                        <p>₹{product.price}</p>

                        <p className="desc">
                          {product.description}
                        </p>
<button
  onClick={() => customizeProduct(product)}
  disabled={product.stock === 0}
>
  {product.stock === 0
    ? "Out of Stock"
    : "Customize & Add to Cart"}
</button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerCollections;