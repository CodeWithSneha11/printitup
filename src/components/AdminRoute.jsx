import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

const AdminRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    // Firebase's own auth state, not localStorage — this can't be
    // spoofed by editing browser storage. The `admin` claim itself
    // lives on the ID token and is set server-side (see
    // server/scripts/setAdminClaim.js); it's what Firestore Security
    // Rules also check, so this is real enforcement, not just a UI gate.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsSignedIn(false);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsSignedIn(true);

      try {
        const tokenResult = await user.getIdTokenResult();
        setIsAdmin(tokenResult.claims.admin === true);
      } catch (error) {
        console.error("Admin claim check failed:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

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

  if (!isSignedIn) {
    return <Navigate to="/admin-login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;