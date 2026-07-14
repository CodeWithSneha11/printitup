import React, { useEffect, useMemo, useState } from "react";
import {
  FaReceipt,
  FaShoppingBag,
  FaUserPlus,
  FaCoins,
  FaArrowUp,
  FaArrowDown,
  FaBoxOpen,
  FaLayerGroup,
  FaPalette,
} from "react-icons/fa";

import { collection, getDocs } from "firebase/firestore";

import { db } from "../firebase";

import "../styles/Analytics.css";

const RANGES = [
  { key: "7d", label: "7D", days: 7 },
  { key: "30d", label: "30D", days: 30 },
  { key: "90d", label: "90D", days: 90 },
  { key: "12m", label: "12M", days: 365 },
];

const Analytics = () => {
  const [rangeKey, setRangeKey] = useState("30d");

  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    customers: 0,
    avgOrder: 0,
    products: 0,
    collections: 0,
    designs: 0,
  });

  const [revenueSeries, setRevenueSeries] = useState([]);
  const [ordersSeries, setOrdersSeries] = useState([]);
  const [labels, setLabels] = useState([]);

  const [recentOrders, setRecentOrders] = useState([]);
  useEffect(() => {
    loadAnalytics();
  }, [rangeKey]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const [orderSnap, userSnap, productSnap, collectionSnap, designSnap] =
        await Promise.all([
          getDocs(collection(db, "orders")),
          getDocs(collection(db, "users")),
          getDocs(collection(db, "products")),
          getDocs(collection(db, "collections")),
          getDocs(collection(db, "designs")),
        ]);

      const allOrders = orderSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const users = userSnap.docs.map((d) => d.data());

      const range = RANGES.find((r) => r.key === rangeKey);

      const today = new Date();

      const filteredOrders = allOrders.filter((order) => {
        if (!order.createdAt) return false;

        const orderDate = order.createdAt.toDate();

        if (range.key === "12m") {
          return orderDate.getFullYear() === today.getFullYear();
        }

        const diff = (today - orderDate) / (1000 * 60 * 60 * 24);

        return diff <= range.days;
      });

      const totalRevenue = filteredOrders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0,
      );

      const totalOrders = filteredOrders.length;

      const avgOrder = totalOrders === 0 ? 0 : totalRevenue / totalOrders;

      setStats({
        revenue: totalRevenue,
        orders: totalOrders,
        customers: users.length,
        avgOrder,
        products: productSnap.size,
        collections: collectionSnap.size,
        designs: designSnap.size,
      });

      buildCharts(filteredOrders);

      setRecentOrders(
        filteredOrders
          .sort((a, b) => {
            if (!a.createdAt || !b.createdAt) return 0;

            return b.createdAt.toDate() - a.createdAt.toDate();
          })
          .slice(0, 5),
      );
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };
  const buildCharts = (orders) => {
    const revenueMap = {};
    const orderMap = {};

    orders.forEach((order) => {
      if (!order.createdAt) return;

      const date = order.createdAt.toDate().toLocaleDateString();

      revenueMap[date] = (revenueMap[date] || 0) + Number(order.total || 0);

      orderMap[date] = (orderMap[date] || 0) + 1;
    });

    const chartLabels = Object.keys(revenueMap);

    setLabels(chartLabels);

    setRevenueSeries(Object.values(revenueMap));

    setOrdersSeries(Object.values(orderMap));
  };
  // ==========================================
  // Sparkline
  // ==========================================

  function Sparkline({ points, positive = true }) {
    if (!points || points.length === 0) return null;

    const w = 100;
    const h = 32;

    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;

    const coords = points.map((v, i) => {
      const x = (i / (points.length - 1 || 1)) * w;
      const y = h - ((v - min) / range) * h;
      return [x, y];
    });

    const path = coords
      .map(
        ([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`,
      )
      .join(" ");

    return (
      <svg
        className="sparkline"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
      >
        <path
          d={path}
          fill="none"
          stroke={positive ? "var(--an-positive)" : "var(--an-negative)"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  function RevenueAreaChart({ points, labels }) {
    if (!points.length) return null;

    const w = 650;
    const h = 220;
    const padding = 24;

    const max = Math.max(...points);
    const range = max || 1;

    const coords = points.map((v, i) => {
      const x = padding + (i / (points.length - 1 || 1)) * (w - padding * 2);

      const y = h - padding - (v / range) * (h - padding * 2);

      return [x, y];
    });

    const linePath = coords
      .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`)
      .join(" ");

    const areaPath = `${linePath}
     L ${coords[coords.length - 1][0]} ${h - padding}
     L ${coords[0][0]} ${h - padding}
     Z`;

    return (
      <svg
        className="revenue-chart"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--an-accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--an-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1={padding}
            x2={w - padding}
            y1={padding + g * (h - padding * 2)}
            y2={padding + g * (h - padding * 2)}
            className="grid-line"
          />
        ))}

        <path d={areaPath} fill="url(#revenueFill)" />

        <path
          d={linePath}
          fill="none"
          stroke="var(--an-accent)"
          strokeWidth="3"
        />

        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill="var(--an-accent)" />
        ))}

        {labels.map((label, i) => (
          <text
            key={i}
            x={coords[i][0]}
            y={h - 6}
            className="axis-label"
            textAnchor="middle"
          >
            {label}
          </text>
        ))}
      </svg>
    );
  }
  function OrdersBarChart({ points, labels }) {
    if (!points.length) return null;

    const w = 650;
    const h = 220;
    const padding = 24;

    const max = Math.max(...points);

    const barWidth = (w - padding * 2) / points.length - 6;

    return (
      <svg
        className="orders-chart"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
      >
        {points.map((value, i) => {
          const height = (value / max) * (h - padding * 2);

          const x = padding + i * (barWidth + 6);

          const y = h - padding - height;

          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={height}
              rx="3"
              className="orders-bar"
            />
          );
        })}

        {labels.map((label, i) => (
          <text
            key={i}
            x={padding + i * (barWidth + 6) + barWidth / 2}
            y={h - 6}
            className="axis-label"
            textAnchor="middle"
          >
            {label}
          </text>
        ))}
      </svg>
    );
  }
  if (loading) {
    return (
      <div className="analytics-page">
        <h2>Loading Analytics...</h2>
      </div>
    );
  }
  return (
    <div className="analytics-page">
      {/* ===========================
        HEADER
    ============================ */}

      <header className="analytics-header">
        <div>
          <h1>Analytics Dashboard</h1>
        </div>

        <div className="range-toggle">
          {RANGES.map((range) => (
            <button
              key={range.key}
              className={
                rangeKey === range.key ? "range-btn active" : "range-btn"
              }
              onClick={() => setRangeKey(range.key)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </header>
      <section className="stats-grid">
        {/* Revenue */}

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-icon">
              <FaCoins />
            </span>

            <span className="stat-delta up">
              <FaArrowUp />
              Live
            </span>
          </div>

          <div className="stat-value">₹{stats.revenue.toLocaleString("en-IN")}</div>

          <div className="stat-label">Total Revenue</div>

          <Sparkline points={revenueSeries} positive />
        </div>

        {/* Orders */}

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-icon">
              <FaReceipt />
            </span>

            <span className="stat-delta up">
              <FaArrowUp />
              Live
            </span>
          </div>

          <div className="stat-value">{stats.orders}</div>

          <div className="stat-label">Orders</div>

          <Sparkline points={ordersSeries} positive />
        </div>

        {/* Customers */}

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-icon">
              <FaUserPlus />
            </span>

            <span className="stat-delta up">
              <FaArrowUp />
              Live
            </span>
          </div>

          <div className="stat-value">{stats.customers}</div>

          <div className="stat-label">Customers</div>

          <Sparkline points={[2, 4, 5, 6, 8, 10, 12]} positive />
        </div>

        {/* Average Order */}

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-icon">
              <FaShoppingBag />
            </span>

            <span className="stat-delta up">
              <FaArrowUp />
              Live
            </span>
          </div>

          <div className="stat-value">₹{Math.round(stats.avgOrder)}</div>

          <div className="stat-label">Avg Order Value</div>

          <Sparkline points={[5, 8, 6, 10, 9, 12]} positive />
        </div>
      </section>
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-icon">
              <FaBoxOpen />
            </span>
          </div>

          <div className="stat-value">{stats.products}</div>

          <div className="stat-label">Products</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-icon">
              <FaLayerGroup />
            </span>
          </div>

          <div className="stat-value">{stats.collections}</div>

          <div className="stat-label">Collections</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-icon">
              <FaPalette />
            </span>
          </div>

          <div className="stat-value">{stats.designs}</div>

          <div className="stat-label">Saved Designs</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-icon">
              <FaReceipt />
            </span>
          </div>

          <div className="stat-value">{recentOrders.length}</div>

          <div className="stat-label">Recent Orders</div>
        </div>
      </section>
      <section className="charts-row single">
        <div className="chart-card">
          <div className="chart-card-header">
            <h2>Revenue Trend</h2>

            <span className="chart-card-meta">
             ₹{stats.revenue.toLocaleString("en-IN")}
            </span>
          </div>

          <RevenueAreaChart points={revenueSeries} labels={labels} />
        </div>
      </section>
      <section className="charts-row single">
        <div className="chart-card">
          <div className="chart-card-header">
            <h2>Orders Trend</h2>

            <span className="chart-card-meta">{stats.orders} Orders</span>
          </div>

          <OrdersBarChart points={ordersSeries} labels={labels} />
        </div>
      </section>
    </div>
  );
};

export default Analytics;
