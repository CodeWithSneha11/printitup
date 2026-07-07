import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Customize from "./pages/Customize";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import MyDesigns from "./pages/MyDesigns";
import Cart from "./pages/cart";
import Checkout from "./pages/Checkout";

import ProtectedRoute from "./components/ProtectedRoute";

import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRoute from "./components/AdminRoute";
import Orders from "./pages/Orders";

function App() {
  return (
    <Router>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route path="/signup" element={<Signup />} />

        <Route
          path="/customize"
          element={
            <ProtectedRoute>
              <Customize />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-designs"
          element={
            <ProtectedRoute>
              <MyDesigns />
            </ProtectedRoute>
          }
        />

        <Route path="/cart" element={<Cart />} />

        <Route path="/checkout" element={<Checkout />} />

        <Route path="/admin-login" element={<AdminLogin />} />

       <Route
  path="/admin-dashboard"
  element={
    <AdminRoute>
      <AdminDashboard />
    </AdminRoute>
  }
/>

<Route
  path="/admin-dashboard/orders"
  element={
    <AdminRoute>
      <Orders />
    </AdminRoute>
  }
/>
      </Routes>
    </Router>
  );
}

export default App;