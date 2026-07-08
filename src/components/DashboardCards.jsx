import React from "react";
import {
  FaShoppingCart,
  FaRupeeSign,
  FaUsers,
  FaClock,
} from "react-icons/fa";

import "../styles/DashboardCards.css";

const DashboardCards = ({
  orders,
  revenue,
  users,
  pending,
}) => {

  const cards = [
    {
      title: "Total Orders",
      value: orders,
      icon: <FaShoppingCart />,
      className: "orders-card",
    },
    {
      title: "Revenue",
      value: `₹${revenue}`,
      icon: <FaRupeeSign />,
      className: "revenue-card",
    },
    {
  title: "Total Users",
  value: users,
  icon: <FaUsers />,
  className: "users-card",
},
    {
      title: "Pending Orders",
      value: pending,
      icon: <FaClock />,
      className: "pending-card",
    },
  ];

  return (
    <div className="cards-grid">

      {cards.map((card, index) => (

        <div
          key={index}
          className={`dashboard-card ${card.className}`}
        >

          <div className="card-top">

            <div className="card-icon">
              {card.icon}
            </div>

          </div>

          <h3>{card.title}</h3>

          <h2>{card.value.toLocaleString()}</h2>
          

        </div>

      ))}

    </div>
  );
};

export default DashboardCards;