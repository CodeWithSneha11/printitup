import {
  HashRouter as Router,
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
import MyOrders from "./pages/MyOrders";
import CustomerCollections from "./pages/CustomerCollections";

import ProtectedRoute from "./components/ProtectedRoute";

import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import Orders from "./pages/Orders";
import Users from "./pages/Users";


import AdminLayout from "./layouts/AdminLayout";
import AdminRoute from "./components/AdminRoute"; 
import Footer from "./components/Footer";
import Profile from "./pages/Profile";
import AdminProfile from "./pages/AdminProfile";
import ManageAddress from "./pages/ManageAddress";
import Collections from "./pages/Collections";
import Analytics from "./pages/Analytics";
function AppContent() {
  const location = useLocation();

  const isAdminPage =
  location.pathname.startsWith("/admin");

  return (
    <>
      {!isAdminPage && <Navbar />}

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
        <Route
 path="/collections"
 element={<CustomerCollections/>}
/>
<Route
  path="/my-orders"
  element={
    <ProtectedRoute>
      <MyOrders />
    </ProtectedRoute>
  }
/><Route
  path="/profile"
  element={
    <ProtectedRoute>
      <Profile />
    </ProtectedRoute>
  }
/>
<Route
path="/manage-address"
element={<ManageAddress/>}
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
  <Route index element={<AdminDashboard />} />
  <Route path="analytics" element={<Analytics />} />
  <Route path="orders" element={<Orders />} />
  <Route path="collections" element={<Collections />} />
  <Route path="users" element={<Users />} />
  <Route path="profile" element={<AdminProfile />} />
</Route>

      </Routes>
       {!isAdminPage && <Footer />}
    </>
  );
}

function App() {
  return (
    <Router basename="/printitup">
      <AppContent />
    </Router>
  );
}

export default App;
