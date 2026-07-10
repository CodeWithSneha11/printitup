import React, { useEffect, useState } from "react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

import {
  FaUserCircle,
  FaSave,
  FaPhone,
  FaEnvelope,
  FaCalendarAlt,
} from "react-icons/fa";

import { db, auth } from "../firebase";

import "../styles/Profile.css";

const Profile = () => {
  const uid = localStorage.getItem("uid");

  const [loading, setLoading] = useState(true);

  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phone: "",
    createdAt: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      if (!uid) {
        setLoading(false);
        return;
      }

      const docRef = doc(db, "users", uid);

      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        let memberSince = "";

        if (data.createdAt) {
          // Firestore Timestamp
          if (typeof data.createdAt.toDate === "function") {
            memberSince = data.createdAt.toDate().toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });
          }
          // Old string value
          else {
            memberSince = data.createdAt;
          }
        }

        setUserData({
          name: data.name || "",
          email: data.email || auth.currentUser?.email || "",
          phone: data.phone || "",
          createdAt: memberSince,
        });
      } else {
        await setDoc(docRef, {
          name: "",
          email: auth.currentUser?.email || "",
          phone: "",
        });

        setUserData({
          name: "",
          email: auth.currentUser?.email || "",
          phone: "",
          createdAt: "",
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
      await updateDoc(doc(db, "users", uid), {
        name: userData.name,
        phone: userData.phone,
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
        <div className="profile-header">
          <div className="profile-avatar">
            {userData.name ? (
              userData.name.charAt(0).toUpperCase()
            ) : (
              <FaUserCircle />
            )}
          </div>

          <h2>{userData.name || "Customer"}</h2>

          <p>{userData.email}</p>
        </div>

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

            <div className="profile-info">
              <FaEnvelope />

              <input type="email" value={userData.email} disabled />
            </div>
          </div>

          <div className="input-group">
            <label>Phone Number</label>

            <div className="profile-info">
              <FaPhone />

              <input
                type="text"
                name="phone"
                value={userData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="profile-extra">
            <div className="extra-card">
              <FaCalendarAlt />

              <div>
                <span>Member Since</span>

                <h4>{userData.createdAt || "Not Available"}</h4>
              </div>
            </div>

           
          </div>

          <button className="save-profile-btn" onClick={saveProfile}>
            <FaSave />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
