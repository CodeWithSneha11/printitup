import React from "react";
import "../styles/DashboardCards.css";

const DashboardCards = ({
  orders,
  revenue,
  users,
  pending,
}) => {

  const cards = [
    {
      title: "Orders",
      value: orders,
      icon: "📦",
    },
    {
      title: "Revenue",
      value: `₹${revenue}`,
      icon: "💰",
    },
    {
      title: "Users",
      value: users,
      icon: "👥",
    },
    {
      title: "Pending",
      value: pending,
      icon: "⏳",
    },
  ];

  return (
    <div className="cards-grid">
      {cards.map((card, index) => (
        <div className="dashboard-card" key={index}>
          <div className="card-icon">{card.icon}</div>

          <h3>{card.title}</h3>

          <h2>{card.value}</h2>
        </div>
      ))}
    </div>
  );
};

export default DashboardCards;