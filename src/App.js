import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Customize from "./pages/Customize";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/ProtectedRoute";


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
          path="/customize"
          element={
            <ProtectedRoute>
              <Customize />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
