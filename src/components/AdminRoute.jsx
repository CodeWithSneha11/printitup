import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const AdminRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const uid = localStorage.getItem("uid");

  useEffect(() => {
    let isMounted = true;

    const checkAdmin = async () => {
      if (!uid) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const adminRef = doc(db, "admins", uid);
        const adminSnap = await getDoc(adminRef);

        if (
          isMounted &&
          adminSnap.exists() &&
          adminSnap.data().role === "admin"
        ) {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error("Admin check error:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAdmin();

    return () => {
      isMounted = false;
    };
  }, [uid]);

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "22px",
          fontWeight: "600",
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