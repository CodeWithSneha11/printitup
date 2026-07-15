import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { collection, getDocs } from "firebase/firestore";

import { db } from "../firebase";

import "../styles/AdminSearch.css";

const AdminSearch = () => {
  const [searchParams] = useSearchParams();

  const query = (searchParams.get("q") || "").toLowerCase();

  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const searchProducts = async () => {
      setLoading(true);

      try {
        const snapshot = await getDocs(collection(db, "products"));

        const allProducts = snapshot.docs.map((doc) => ({
          id: doc.id,

          ...doc.data(),
        }));

        const filteredProducts = allProducts.filter((product) => {
          const name = (product.name || "").toLowerCase();

          const description = (product.description || "").toLowerCase();

          const collectionName = (product.collectionName || "").toLowerCase();

          return (
            name.includes(query) ||
            description.includes(query) ||
            collectionName.includes(query)
          );
        });

        setProducts(filteredProducts);
      } catch (error) {
        console.error("Search Error:", error);
      } finally {
        setLoading(false);
      }
    };

    searchProducts();
  }, [query]);

  return (
    <div className="admin-search-container">
      {/* HEADER */}

      <div className="search-header">
        <h2>Search Results</h2>

        <p className="search-query">
          Searching for:
          <strong>{query || "All Products"}</strong>
        </p>
      </div>

      {loading ? (
        <div className="search-loading">
          <div className="loader-circle"></div>
          Searching products...
        </div>
      ) : (
        <>
          <h2 className="products-title">
            Products Found
            <span className="result-count">{products.length}</span>
          </h2>

          {products.length === 0 ? (
            <div className="no-products">
              <h3>No Products Found</h3>

              <p>Try searching with another keyword.</p>
            </div>
          ) : (
            <div className="products-grid">
              {products.map((product) => (
                <div className="product-card" key={product.id}>
                  {/* IMAGE */}

                  <div className="product-image-wrapper">
                    <img
                      src={product.image || "/placeholder.png"}
                      alt={product.name}
                    />

                    <span className="image-badge">Product</span>
                  </div>

                  {/* CONTENT */}

                  <div className="product-card-content">
                    <h3>{product.name}</h3>

                    {product.collectionName && (
                      <p className="product-collection">
                         {product.collectionName}
                      </p>
                    )}

                    <div className="product-info">
                      <div className="info-box">
                        <span className="info-label">Price</span>

                        <span className="info-value price-value">
                          ₹{product.price || 0}
                        </span>
                      </div>

                      <div className="info-box">
                        <span className="info-label">Stock</span>

                        <span
                          className={
                            product.stock < 10
                              ? "info-value stock-low"
                              : "info-value stock-good"
                          }
                        >
                          {product.stock ?? 0} Units
                        </span>
                      </div>
                    </div>

                    <div className="product-footer">
                      <span className="product-id">
                        ID: {product.id.slice(0, 8)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminSearch;
