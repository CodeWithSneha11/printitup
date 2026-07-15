import React from "react";

import {
  FaShoppingBag,
  FaRupeeSign,
  FaChartLine,
  FaUserPlus,
} from "react-icons/fa";

import "../styles/TodaysSummary.css";

const TodaysSummary = ({
  todayOrders,
  todayRevenue,
  averageOrder,
  newUsers,
}) => {
  const cards = [
    {
      title: "Today's Orders",
      value: todayOrders,
      icon: <FaShoppingBag />,
      className: "today-orders",
    },

    {
      title: "Today's Revenue",
      value: `₹${todayRevenue}`,
      icon: <FaRupeeSign />,
      className: "today-revenue",
    },

    {
      title: "Average Order Value",
      value: `₹${averageOrder}`,
      icon: <FaChartLine />,
      className: "today-average",
    },

    {
      title: "New Users Today",
      value: newUsers,
      icon: <FaUserPlus />,
      className: "today-users",
    },
  ];

  return (
    <div className="today-summary-section">
      <h2 className="summary-title">Today's Summary</h2>

      <div className="today-grid">
        {cards.map((card, index) => (
          <div key={index} className={`today-card ${card.className}`}>
            <div className="today-icon">{card.icon}</div>

            <div className="today-info">
              <p>{card.title}</p>

              <h2>{card.value}</h2>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TodaysSummary;
