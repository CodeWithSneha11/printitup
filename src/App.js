import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

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
import Orders from "./pages/Orders";
import Users from "./pages/Users";
import Collections from "./pages/Collections";

import AdminLayout from "./layouts/AdminLayout";
import AdminRoute from "./components/AdminRoute";
import Products from "./pages/Products";
function AppContent() {
  const location = useLocation();

  // Hide customer navbar on all admin pages
  const hideNavbar = location.pathname.startsWith("/admin");

  return (
    <>
      {!hideNavbar && <Navbar />}

      <Routes>

        {/* ==========================
            CUSTOMER ROUTES
        =========================== */}

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

        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <Cart />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />

        {/* ==========================
              ADMIN LOGIN
        =========================== */}

        <Route
          path="/admin-login"
          element={<AdminLogin />}
        />

        {/* ==========================
             ADMIN DASHBOARD
        =========================== */}

        <Route
          path="/admin-dashboard"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          {/* Dashboard */}
          <Route
            index
            element={<AdminDashboard />}
          />

          {/* Orders */}
          <Route
            path="orders"
            element={<Orders />}
          />

          {/* Collections */}
          <Route
            path="collections"
            element={<Collections />}
          />

          {/* Users */}
          <Route
            path="users"
            element={<Users />}
          />

       <Route
  path="products/:collectionId"
  element={<Products />}
/>

          {/* Analytics */}
          {/* <Route
            path="analytics"
            element={<Analytics />}
          /> */}

          {/* Settings */}
          {/* <Route
            path="settings"
            element={<Settings />}
          /> */}

        </Route>

      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;