import React, { useEffect, useState } from "react";
import {
    collection,
    onSnapshot,
    doc,
    updateDoc,
     deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import "../styles/Orders.css";

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "orders"), (snapshot) => {
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
        return <div className="orders-loading">Loading Orders...</div>;
    } const updateStatus = async (id, newStatus) => {

        try {

            await updateDoc(
                doc(db, "orders", id),
                {
                    status: newStatus,
                }
            );

        } catch (error) {

            console.log(error);

            alert("Unable to update status.");

        }

    };
    const deleteOrder = async (id) => {

  const confirmDelete = window.confirm(
    "Are you sure you want to delete this order?"
  );

  if (!confirmDelete) return;

  try {

    await deleteDoc(doc(db, "orders", id));

    alert("Order deleted successfully.");

  } catch (error) {

    console.log(error);

    alert("Failed to delete order.");

  }

};
    return (
        <div className="orders-page">
            <div className="orders-header">
                <h1>Orders</h1>
                <p>Total Orders : {orders.length}</p>
            </div>

            <div className="orders-card">
              <table className="orders-table">

  <thead>

    <tr>

      <th>Customer</th>

      <th>Phone</th>

      <th>Total</th>

      <th>Status</th>

      <th>Action</th>

    </tr>

  </thead>

  <tbody>

    {orders.length === 0 ? (

      <tr>

        <td
          colSpan="5"
          style={{
            textAlign: "center",
            padding: "30px",
          }}
        >
          No Orders Found
        </td>

      </tr>

    ) : (

      orders.map((order) => (

        <tr key={order.id}>

          {/* Customer */}

          <td>
            {order.customer?.name}
          </td>

          {/* Phone */}

          <td>
            {order.customer?.phone}
          </td>

          {/* Total */}

          <td>
            ₹{order.total}
          </td>

          {/* Status Dropdown */}

          <td>

            <select
              className="status-select"
              value={order.status}
              onChange={(e) =>
                updateStatus(
                  order.id,
                  e.target.value
                )
              }
            >

              <option value="Pending">
                Pending
              </option>

              <option value="Processing">
                Processing
              </option>

              <option value="Shipped">
                Shipped
              </option>

              <option value="Delivered">
                Delivered
              </option>

            </select>

          </td>

          {/* View Button */}

       <td>

  <div className="action-buttons">

    <button
      className="view-btn"
      onClick={() =>
        setSelectedOrder(order)
      }
    >
      View
    </button>

    <button
      className="delete-btn"
      onClick={() =>
        deleteOrder(order.id)
      }
    >
      Delete
    </button>

  </div>

</td>

        </tr>

      ))

    )}

  </tbody>

</table>
                {selectedOrder && (

                    <div
                        className="modal-overlay"
                        onClick={() => setSelectedOrder(null)}
                    >

                        <div
                            className="order-modal"
                            onClick={(e) => e.stopPropagation()}
                        >

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

                                <h3>Customer Information</h3>

                                <p><strong>Name :</strong> {selectedOrder.customer.name}</p>

                                <p><strong>Phone :</strong> {selectedOrder.customer.phone}</p>

                                <p><strong>Email :</strong> {selectedOrder.customer.email}</p>

                                <p><strong>Address :</strong> {selectedOrder.customer.address}</p>

                                <p><strong>City :</strong> {selectedOrder.customer.city}</p>

                                <p><strong>State :</strong> {selectedOrder.customer.state}</p>

                                <p><strong>Pincode :</strong> {selectedOrder.customer.pincode}</p>

                                <p><strong>Payment :</strong> {selectedOrder.customer.payment}</p>

                                <p><strong>Status :</strong> {selectedOrder.status}</p>

                            </div>

                            <hr />

                            <h3 className="items-title">
                                Ordered Products
                            </h3>

                            <div className="items-list">

                                {selectedOrder.items.map((item, index) => (

                                    <div
                                        className="item-card"
                                        key={index}
                                    >

                                        <div className="item-image">

                                            {item.imageUrl ? (

                                                <img
                                                    src={item.imageUrl}
                                                    alt="Design"
                                                />

                                            ) : (

                                                <div className="no-image">
                                                    No Image
                                                </div>

                                            )}

                                        </div>

                                        <div className="item-details">

                                            <h4>
                                                {item.text || "Custom T-Shirt"}
                                            </h4>

                                            <p>Color : {item.tshirtColor}</p>

                                            <p>Size : {item.size}</p>

                                            <p>Neck : {item.neck}</p>

                                            <p>Side : {item.side}</p>

                                            <p>Position : {item.position}</p>

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
        </div>
    );
};

export default Orders;
