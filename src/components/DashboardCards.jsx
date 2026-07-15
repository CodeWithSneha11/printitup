import React from "react";
import {
  FaShoppingCart,
  FaRupeeSign,
  FaUsers,
  FaClock,
  FaBan,
} from "react-icons/fa";

import "../styles/DashboardCards.css";

const DashboardCards = ({
  orders,
  revenue,
  users,
  pending,
  cancelled,
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
    {
  title: "Cancelled Orders",
  value: cancelled,
  icon: <FaBan />,
  className: "cancelled-card",
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