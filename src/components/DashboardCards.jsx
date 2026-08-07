import React from "react";
import {
  FaShoppingCart,
  FaRupeeSign,
  FaUsers,
  FaClock,
  FaBan,
} from "react-icons/fa";

import "../styles/DashboardCards.css";

const formatINR = (num) =>
  new Intl.NumberFormat("en-IN").format(Number(num) || 0);

const DashboardCards = ({ orders, revenue, users, pending, cancelled }) => {
  const cards = [
    {
      title: "Total Orders",
      value: formatINR(orders),
      icon: <FaShoppingCart />,
      className: "orders-card",
    },
    {
      title: "Revenue",
      value: `₹${formatINR(revenue)}`,
      icon: <FaRupeeSign />,
      className: "revenue-card",
    },
    {
      title: "Total Users",
      value: formatINR(users),
      icon: <FaUsers />,
      className: "users-card",
    },
    {
      title: "Pending Orders",
      value: formatINR(pending),
      icon: <FaClock />,
      className: "pending-card",
    },
    {
      title: "Cancelled Orders",
      value: formatINR(cancelled),
      icon: <FaBan />,
      className: "cancelled-card",
    },
  ];

  return (
    <div className="cards-grid">
      {cards.map((card, index) => (
        <div key={index} className={`dashboard-card ${card.className}`}>
          <div className="card-top">
            <div className="card-icon">{card.icon}</div>
          </div>

          <h3>{card.title}</h3>

          <h2>{card.value}</h2>
        </div>
      ))}
    </div>
  );
};

export default DashboardCards;