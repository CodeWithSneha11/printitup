import React, { useMemo, useState } from "react";
import {
  FaReceipt,
  FaShoppingBag,
  FaUserPlus,
  FaCoins,
  FaArrowUp,
  FaArrowDown,
} from "react-icons/fa";

import "../styles/Analytics.css";

// ---------------------------------------------------------------------------
// Mock data generation
// Swap generateAnalyticsData() out for a real API call (e.g. useEffect + fetch
// to `/api/admin/analytics?range=${range}`) once the backend endpoint exists.
// ---------------------------------------------------------------------------

const RANGES = [
  { key: "7d", label: "7D", days: 7 },
  { key: "30d", label: "30D", days: 30 },
  { key: "90d", label: "90D", days: 90 },
  { key: "12m", label: "12M", days: 365 },
];

// simple seeded PRNG so numbers stay stable per range instead of jumping
// around on every re-render
function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateSeries(days, seed, base, volatility) {
  const rand = seededRandom(seed);
  const points = [];
  let value = base;
  for (let i = 0; i < days; i++) {
    const drift = (rand() - 0.42) * volatility;
    value = Math.max(base * 0.25, value + drift);
    points.push(Math.round(value));
  }
  return points;
}

function generateAnalyticsData(rangeKey) {
  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[1];
  const sampleDays = range.key === "12m" ? 12 : range.days;
  const seed = range.days * 97;

  const revenueSeries = generateSeries(sampleDays, seed, 1400, 260);
  const ordersSeries = generateSeries(sampleDays, seed + 1, 42, 10);

  const totalRevenue = revenueSeries.reduce((a, b) => a + b, 0);
  const totalOrders = ordersSeries.reduce((a, b) => a + b, 0);
  const newCustomers = Math.round(totalOrders * 0.36);
  const avgOrderValue = totalRevenue / Math.max(1, totalOrders);

  const stats = [
    {
      key: "revenue",
      label: "Total Revenue",
      value: `$${totalRevenue.toLocaleString()}`,
      delta: 12.4,
      icon: <FaCoins />,
      series: revenueSeries,
    },
    {
      key: "orders",
      label: "Orders",
      value: totalOrders.toLocaleString(),
      delta: 6.8,
      icon: <FaReceipt />,
      series: ordersSeries,
    },
    {
      key: "customers",
      label: "New Customers",
      value: newCustomers.toLocaleString(),
      delta: -3.1,
      icon: <FaUserPlus />,
      series: generateSeries(sampleDays, seed + 2, 15, 5),
    },
    {
      key: "aov",
      label: "Avg. Order Value",
      value: `$${avgOrderValue.toFixed(2)}`,
      delta: 4.2,
      icon: <FaShoppingBag />,
      series: generateSeries(sampleDays, seed + 3, 32, 6),
    },
  ];

  return {
    range,
    revenueSeries,
    ordersSeries,
    stats,
  };
}

// ---------------------------------------------------------------------------
// Small SVG chart primitives (no external chart library required)
// ---------------------------------------------------------------------------

function Sparkline({ points, positive }) {
  if (!points.length) return null;
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
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");

  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
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
  const w = 640;
  const h = 220;
  const padding = 24;
  const max = Math.max(...points);
  const min = 0;
  const range = max - min || 1;

  const coords = points.map((v, i) => {
    const x = padding + (i / (points.length - 1 || 1)) * (w - padding * 2);
    const y = h - padding - ((v - min) / range) * (h - padding * 2);
    return [x, y];
  });

  const linePath = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L ${coords[coords.length - 1][0]} ${h - padding} L ${
    coords[0][0]
  } ${h - padding} Z`;

  // pick ~5 evenly spaced label indices so the axis doesn't get crowded
  const labelStep = Math.max(1, Math.floor(labels.length / 5));

  return (
    <svg className="revenue-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--an-accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--an-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={padding}
          x2={w - padding}
          y1={padding + f * (h - padding * 2)}
          y2={padding + f * (h - padding * 2)}
          className="grid-line"
        />
      ))}

      <path d={areaPath} fill="url(#revenueFill)" stroke="none" />
      <path d={linePath} fill="none" stroke="var(--an-accent)" strokeWidth="2.5" />

      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === coords.length - 1 ? 4 : 0} fill="var(--an-accent)" />
      ))}

      {labels.map((l, i) =>
        i % labelStep === 0 ? (
          <text
            key={i}
            x={coords[i][0]}
            y={h - 4}
            textAnchor="middle"
            className="axis-label"
          >
            {l}
          </text>
        ) : null
      )}
    </svg>
  );
}

function OrdersBarChart({ points, labels }) {
  const w = 640;
  const h = 220;
  const padding = 24;
  const max = Math.max(...points) || 1;
  const barGap = 4;
  const barWidth = (w - padding * 2) / points.length - barGap;

  const labelStep = Math.max(1, Math.floor(labels.length / 5));

  return (
    <svg className="orders-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {points.map((v, i) => {
        const barH = ((v / max) * (h - padding * 2)) || 0;
        const x = padding + i * (barWidth + barGap);
        const y = h - padding - barH;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={Math.max(1, barWidth)}
            height={barH}
            rx="2"
            className="orders-bar"
          />
        );
      })}
      {labels.map((l, i) =>
        i % labelStep === 0 ? (
          <text
            key={i}
            x={padding + i * (barWidth + barGap) + barWidth / 2}
            y={h - 4}
            textAnchor="middle"
            className="axis-label"
          >
            {l}
          </text>
        ) : null
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const Analytics = () => {
  const [rangeKey, setRangeKey] = useState("30d");

  const data = useMemo(() => generateAnalyticsData(rangeKey), [rangeKey]);

  const revenueLabels = data.revenueSeries.map((_, i) => `${i + 1}`);

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <div>
          <h1>Analytics</h1>
          <p className="analytics-subtitle">
            Store performance overview for the selected period
          </p>
        </div>

        <div className="range-toggle" role="tablist" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r.key}
              role="tab"
              aria-selected={rangeKey === r.key}
              className={rangeKey === r.key ? "range-btn active" : "range-btn"}
              onClick={() => setRangeKey(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <section className="stats-grid">
        {data.stats.map((s) => {
          const positive = s.delta >= 0;
          return (
            <div className="stat-card" key={s.key}>
              <div className="stat-card-top">
                <span className="stat-icon">{s.icon}</span>
                <span className={`stat-delta ${positive ? "up" : "down"}`}>
                  {positive ? <FaArrowUp /> : <FaArrowDown />}
                  {Math.abs(s.delta).toFixed(1)}%
                </span>
              </div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <Sparkline points={s.series} positive={positive} />
            </div>
          );
        })}
      </section>

      <section className="charts-row single">
        <div className="chart-card revenue-card">
          <div className="chart-card-header">
            <h2>Revenue Trend</h2>
            <span className="chart-card-meta">
              {data.range.label} · {data.revenueSeries.length} data points
            </span>
          </div>
          <RevenueAreaChart points={data.revenueSeries} labels={revenueLabels} />
        </div>
      </section>

      <section className="charts-row single">
        <div className="chart-card orders-card">
          <div className="chart-card-header">
            <h2>Orders</h2>
            <span className="chart-card-meta">
              {data.ordersSeries.reduce((a, b) => a + b, 0).toLocaleString()} total
            </span>
          </div>
          <OrdersBarChart points={data.ordersSeries} labels={revenueLabels} />
        </div>
      </section>
    </div>
  );
};

export default Analytics;