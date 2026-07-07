import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";

const AdminRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const uid = localStorage.getItem("uid");
  const email = localStorage.getItem("email");

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    if (!uid || !email) {
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, "admins"),
        where("email", "==", email)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        setIsAdmin(true);
      }
    } catch (error) {
      console.log("Admin check error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "22px",
        }}
      >
        Checking Admin Access...
      </div>
    );
  }

  if (!uid) {
    return <Navigate to="/admin-login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;