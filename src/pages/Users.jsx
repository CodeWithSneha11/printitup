import React, { useEffect, useState } from "react";
import {
collection,
getDocs,
query,
where
} from "firebase/firestore";
import { db } from "../firebase";
import "../styles/Users.css";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
const [selectedUser, setSelectedUser] = useState(null);
const [userOrders, setUserOrders] = useState([]);
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(collection(db, "users"));

      const userList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setUsers(userList);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };
  const openUserDetails = async (user) => {

  setSelectedUser(user);

  try {

    const q = query(
      collection(db, "orders"),
      where("uid", "==", user.uid)
    );

    const snapshot = await getDocs(q);

    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    setUserOrders(orders);

  } catch (error) {

    console.log(error);

  }

};

  if (loading) {
    return (
      <div className="admin-content">
        <h2>Loading Users...</h2>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="users-header">
        <div>
          <h1 className="admin-title">Users</h1>
          <p>Total Users : {users.length}</p>
        </div>
      </div>

      <div className="users-card">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Joined</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  style={{
                    textAlign: "center",
                    padding: "30px",
                  }}
                >
                  No Users Found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name || "-"}</td>

                  <td>{user.email}</td>

                  <td>
                    {user.createdAt
                      ? new Date(
                          user.createdAt.seconds * 1000,
                        ).toLocaleDateString()
                      : "-"}
                  </td>

                  <td>
                    <button
  className="view-btn"
  onClick={() => openUserDetails(user)}
>
  View
</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {selectedUser && (

<div
  className="modal-overlay"
  onClick={() => setSelectedUser(null)}
>

  <div
    className="user-modal"
    onClick={(e) => e.stopPropagation()}
  >

    <div className="modal-header">

      <h2>User Details</h2>

      <button
        className="close-btn"
        onClick={() => setSelectedUser(null)}
      >
        ✕
      </button>

    </div>

    <div className="user-info">

      <p>
        <strong>Name :</strong>{" "}
        {selectedUser.name || "-"}
      </p>

      <p>
        <strong>Email :</strong>{" "}
        {selectedUser.email}
      </p>

      <p>
        <strong>UID :</strong>{" "}
        {selectedUser.uid}
      </p>

      <p>
        <strong>Joined :</strong>{" "}
        {selectedUser.createdAt
          ? new Date(
              selectedUser.createdAt.seconds * 1000
            ).toLocaleString()
          : "-"}

      </p>

    </div>
<hr />

<h3 style={{ marginTop: "20px" }}>
  Order Summary
</h3>

<p>
  <strong>Total Orders :</strong> {userOrders.length}
</p>

<p>
  <strong>Total Spent :</strong> ₹
  {userOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  )}
</p>
<h3 style={{ marginTop: "25px" }}>
  Orders
</h3>

{userOrders.length === 0 ? (

  <p>No Orders Found</p>

) : (

  userOrders.map((order) => (

    <div
      key={order.id}
      className="user-order-card"
    >

      <div>

        <h4>
          Order #{order.id.slice(0,6)}
        </h4>

        <p>
          Status :
          <strong> {order.status}</strong>
        </p>

        <p>
          Total :
          <strong> ₹{order.total}</strong>
        </p>

      </div>

    </div>

  ))

)}
  </div>

</div>

)}
    </div>
  );
};

export default Users;
