import React, { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { FaUserCircle, FaSave } from "react-icons/fa";
import "../styles/Profile.css";

const Profile = () => {
  const [loading, setLoading] = useState(true);

  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const uid = localStorage.getItem("uid");

      if (!uid) {
        setLoading(false);
        return;
      }

      const docRef = doc(db, "users", uid);

      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setUserData({
          name: docSnap.data().name || "",
          email: docSnap.data().email || "",
          phone: docSnap.data().phone || "",
          address: docSnap.data().address || "",
          city: docSnap.data().city || "",
          state: docSnap.data().state || "",
          pincode: docSnap.data().pincode || "",
        });
      } else {
        await setDoc(docRef, {
          name: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          state: "",
          pincode: "",
        });

        setUserData({
          name: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          state: "",
          pincode: "",
        });
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setUserData({
      ...userData,
      [e.target.name]: e.target.value,
    });
  };

  const saveProfile = async () => {
    try {
      const uid = localStorage.getItem("uid");

      await updateDoc(doc(db, "users", uid), {
        name: userData.name,
        phone: userData.phone,
        address: userData.address,
        city: userData.city,
        state: userData.state,
        pincode: userData.pincode,
      });

      alert("Profile Updated Successfully!");
    } catch (error) {
      console.log(error);
      alert("Unable to update profile.");
    }
  };

  if (loading) {
    return <h2 className="profile-loading">Loading...</h2>;
  }

  return (
    <div className="profile-page">
      <div className="profile-card">

        <div className="profile-avatar">
          <FaUserCircle />
        </div>

        <h2>{userData.name || "Customer"}</h2>

        <p className="profile-email">
          {userData.email}
        </p>

        <div className="profile-form">

          <div className="input-group">
            <label>Full Name</label>

            <input
              type="text"
              name="name"
              value={userData.name}
              onChange={handleChange}
            />
          </div>

          <div className="input-group">
            <label>Email</label>

            <input
              type="email"
              value={userData.email}
              disabled
            />
          </div>

          <div className="input-group">
            <label>Phone Number</label>

            <input
              type="text"
              name="phone"
              value={userData.phone}
              onChange={handleChange}
            />
          </div>

          <div className="input-group">
            <label>Address</label>

            <textarea
              rows="3"
              name="address"
              value={userData.address}
              onChange={handleChange}
            />
          </div>

          <div className="input-group">
            <label>City</label>

            <input
              type="text"
              name="city"
              value={userData.city}
              onChange={handleChange}
            />
          </div>

          <div className="input-group">
            <label>State</label>

            <input
              type="text"
              name="state"
              value={userData.state}
              onChange={handleChange}
            />
          </div>

          <div className="input-group">
            <label>Pincode</label>

            <input
              type="text"
              name="pincode"
              value={userData.pincode}
              onChange={handleChange}
            />
          </div>

          <button
            className="save-profile-btn"
            onClick={saveProfile}
          >
            <FaSave />
            Save Changes
          </button>

        </div>

      </div>
    </div>
  );
};

export default Profile;