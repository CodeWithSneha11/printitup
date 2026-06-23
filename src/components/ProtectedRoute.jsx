import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {

  const uid = localStorage.getItem("uid");

  return uid
    ? children
    : <Navigate to="/login" />;
}

export default ProtectedRoute;