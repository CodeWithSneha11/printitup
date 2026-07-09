import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import "../styles/MyOrders.css";

const MyOrders = () => {

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {

    const user = auth.currentUser;

    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "orders"),
      where("uid", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      data.sort((a, b) => {
        const first = a.createdAt?.seconds || 0;
        const second = b.createdAt?.seconds || 0;
        return second - first;
      });

      setOrders(data);
      setLoading(false);

    });

    return () => unsubscribe();

  }, []);

  if (loading) {
    return (
      <div className="myorders-loading">
        Loading Orders...
      </div>
    );
  }

  return (
  <div className="myorders-page">

    <div className="myorders-header">

      <h1>My Orders</h1>

      <p>Total Orders : {orders.length}</p>

    </div>

    {orders.length === 0 ? (

      <div className="empty-orders">

        <h2>No Orders Yet</h2>

        <p>Your placed orders will appear here.</p>

      </div>

    ) : (

      <div className="orders-grid">

        {orders.map((order) => (

          <div
            className="order-card"
            key={order.id}
          >

            <div className="order-top">

              <div>

                <h3>
                  Order #{order.id.slice(0, 8)}
                </h3>

                <p>
                  {order.createdAt?.toDate().toLocaleDateString()}
                </p>

              </div>

              <span
                className={`status ${order.status?.toLowerCase()}`}
              >
                {order.status}
              </span>

            </div>

            <div className="order-middle">

              <p>

                <strong>Products :</strong>{" "}
                {order.items?.length}

              </p>

              <p>

                <strong>Total :</strong> ₹{order.total}

              </p>

            </div>

            <button
              className="details-btn"
              onClick={() => setSelectedOrder(order)}
            >
              View Details
            </button>

          </div>

        ))}

      </div>

    )}
{selectedOrder && (

<div className="modal-overlay">

    <div className="order-modal">

        <div className="modal-header">

            <h2>Order Details</h2>

            <button
                className="close-btn"
                onClick={() => setSelectedOrder(null)}
            >
                ✕
            </button>

        </div>

        <div className="customer-section">

            <h3>Customer Details</h3>

            <p>
                <strong>Name:</strong>{" "}
                {selectedOrder.customer?.name}
            </p>

            <p>
                <strong>Email:</strong>{" "}
                {selectedOrder.customer?.email}
            </p>

            <p>
                <strong>Phone:</strong>{" "}
                {selectedOrder.customer?.phone}
            </p>

            <p>
                <strong>Address:</strong>{" "}
                {selectedOrder.customer?.address}
            </p>

            <p>
                <strong>City:</strong>{" "}
                {selectedOrder.customer?.city}
            </p>

            <p>
                <strong>State:</strong>{" "}
                {selectedOrder.customer?.state}
            </p>

            <p>
                <strong>Pincode:</strong>{" "}
                {selectedOrder.customer?.pincode}
            </p>

            <p>
                <strong>Payment:</strong>{" "}
                {selectedOrder.customer?.payment}
            </p>

        </div>

        <h3 className="items-title">

            Ordered Products

        </h3>

        <div className="items-list">

            {selectedOrder.items?.map((item, index) => (

                <div
                    className="item-card"
                    key={index}
                >

                    <div className="item-image">

                        {item.imageUrl ? (

                            <img
                                src={item.imageUrl}
                                alt=""
                            />

                        ) : (

                            <div className="no-image">

                                No Image

                            </div>

                        )}

                    </div>

                    <div className="item-details">

                        <h4>
                            Custom T-Shirt
                        </h4>

                        <p>
                            <strong>Text:</strong>{" "}
                            {item.text || "-"}
                        </p>

                        <p>
                            <strong>Size:</strong>{" "}
                            {item.size}
                        </p>

                        <p>
                            <strong>Color:</strong>{" "}
                            {item.tshirtColor}
                        </p>

                        <p>
                            <strong>Neck:</strong>{" "}
                            {item.neck}
                        </p>

                        <p>
                            <strong>Print:</strong>{" "}
                            {item.side}
                        </p>

                        <p>
                            <strong>Position:</strong>{" "}
                            {item.position}
                        </p>

                    </div>

                    <div className="item-price">

                        ₹{item.price}

                    </div>

                </div>

            ))}

        </div>

        <div className="modal-total">

            Grand Total : ₹{selectedOrder.total}

        </div>

    </div>

</div>

)}
  </div>
);
};

export default MyOrders;