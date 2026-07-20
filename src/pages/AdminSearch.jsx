import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { collection, getDocs } from "firebase/firestore";

import { db } from "../firebase";

import "../styles/AdminSearch.css";

// "3m ago" / "2h ago" / "5d ago"
const timeAgo = (seconds) => {
  if (!seconds) return "";

  const diff = Date.now() / 1000 - seconds;

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const TABS = [
  { key: "all", label: "All" },
  { key: "products", label: "Products" },
  { key: "collections", label: "Collections" },
  { key: "orders", label: "Orders" },
];

const AdminSearch = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const query = (searchParams.get("q") || "").toLowerCase().trim();

  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const runSearch = async () => {
      setLoading(true);

      try {
        const [productsSnap, collectionsSnap, ordersSnap] = await Promise.all(
          [
            getDocs(collection(db, "products")),
            getDocs(collection(db, "collections")),
            getDocs(collection(db, "orders")),
          ],
        );

        const allProducts = productsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const allCollections = collectionsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const allOrders = ordersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const filteredProducts = allProducts.filter((product) => {
          const name = (product.name || "").toLowerCase();
          const description = (product.description || "").toLowerCase();
          const collectionName = (
            product.collectionName || ""
          ).toLowerCase();

          return (
            name.includes(query) ||
            description.includes(query) ||
            collectionName.includes(query)
          );
        });

        const filteredCollections = allCollections.filter((col) => {
          const name = (col.name || "").toLowerCase();
          const description = (col.description || "").toLowerCase();

          return name.includes(query) || description.includes(query);
        });

        const filteredOrders = allOrders.filter((order) => {
          const orderId = order.id.toLowerCase();
          const customerName = (order.customer?.name || "").toLowerCase();
          const customerEmail = (order.customer?.email || "").toLowerCase();
          const status = (order.status || "").toLowerCase();

          return (
            orderId.includes(query) ||
            customerName.includes(query) ||
            customerEmail.includes(query) ||
            status.includes(query)
          );
        });

        setProducts(filteredProducts);
        setCollections(filteredCollections);
        setOrders(filteredOrders);
      } catch (error) {
        console.error("Search Error:", error);
      } finally {
        setLoading(false);
      }
    };

    if (query) {
      runSearch();
    } else {
      setProducts([]);
      setCollections([]);
      setOrders([]);
      setLoading(false);
    }
  }, [query]);

  const totalResults = products.length + collections.length + orders.length;

  // Reset back to "All" whenever a fresh search is run so a stale tab
  // (e.g. "Orders" from a previous query) doesn't hide new results.
  useEffect(() => {
    setActiveTab("all");
  }, [query]);

  const showProducts = activeTab === "all" || activeTab === "products";
  const showCollections = activeTab === "all" || activeTab === "collections";
  const showOrders = activeTab === "all" || activeTab === "orders";

  const tabCounts = useMemo(
    () => ({
      all: totalResults,
      products: products.length,
      collections: collections.length,
      orders: orders.length,
    }),
    [totalResults, products.length, collections.length, orders.length],
  );

  return (
    <div className="admin-search-container">
      {/* HEADER */}
      <div className="search-header">
        <h2>Search Results</h2>

        <p className="search-query">
          Searching for:
          <strong>{query || "everything"}</strong>
        </p>
      </div>

      {!loading && query && (
        <div className="search-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`search-tab${
                activeTab === tab.key ? " search-tab-active" : ""
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              <span className="search-tab-count">{tabCounts[tab.key]}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="search-loading">
          <div className="loader-circle"></div>
          Searching...
        </div>
      ) : !query ? (
        <div className="no-products">
          <h3>Start typing to search</h3>
          <p>Search across products, collections, and orders.</p>
        </div>
      ) : totalResults === 0 ? (
        <div className="no-products">
          <h3>No Results Found</h3>
          <p>Try searching with another keyword.</p>
        </div>
      ) : (
        <>
          {/* ================= COLLECTIONS ================= */}
          {showCollections && collections.length > 0 && (
            <>
              <h2 className="products-title">
                Collections Found
                <span className="result-count">{collections.length}</span>
              </h2>

              <div className="products-grid">
                {collections.map((col) => (
                  <div
                    className="product-card"
                    key={col.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate("/admin-dashboard/collections")}
                  >
                    <div className="product-image-wrapper">
                      <img
                        src={col.image || "/placeholder.png"}
                        alt={col.name}
                      />
                      <span className="image-badge image-badge-collection">
                        Collection
                      </span>
                    </div>

                    <div className="product-card-content">
                      <h3>{col.name}</h3>

                      {col.description && (
                        <p className="product-collection">
                          {col.description}
                        </p>
                      )}

                      <div className="product-info">
                        <div className="info-box">
                          <span className="info-label">Products</span>
                          <span className="info-value">
                            {col.productCount ?? "—"}
                          </span>
                        </div>
                      </div>

                      <div className="product-footer">
                        <span className="product-id">
                          ID: {col.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ================= PRODUCTS ================= */}
          {showProducts && products.length > 0 && (
            <>
              <h2 className="products-title">
                Products Found
                <span className="result-count">{products.length}</span>
              </h2>

              <div className="products-grid">
                {products.map((product) => (
                  <div className="product-card" key={product.id}>
                    <div className="product-image-wrapper">
                      <img
                        src={product.image || "/placeholder.png"}
                        alt={product.name}
                      />
                      <span className="image-badge">Product</span>
                    </div>

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
            </>
          )}

          {/* ================= ORDERS ================= */}
          {showOrders && orders.length > 0 && (
            <>
              <h2 className="products-title">
                Orders Found
                <span className="result-count">{orders.length}</span>
              </h2>

              <div className="orders-list">
                {orders.map((order) => (
                  <button
                    className="order-result-card"
                    key={order.id}
                    onClick={() => navigate("/admin-dashboard/orders")}
                  >
                    <div className="order-result-avatar">
                      {(order.customer?.name || "?").charAt(0).toUpperCase()}
                    </div>

                    <div className="order-result-body">
                      <p>
                        <strong>
                          {order.customer?.name || "Unknown customer"}
                        </strong>
                        <span
                          className={`order-status-pill order-status-${(
                            order.status || "pending"
                          ).toLowerCase()}`}
                        >
                          {order.status || "Pending"}
                        </span>
                      </p>
                      <span className="order-result-meta">
                        ID: {order.id.slice(0, 8)} · ₹{order.total || 0} ·{" "}
                        {timeAgo(order.createdAt?.seconds)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AdminSearch;