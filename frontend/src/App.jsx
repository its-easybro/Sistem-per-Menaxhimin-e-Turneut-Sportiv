import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import SportsManagment from "./pages/admin/SportsManagment";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminRoute from "./components/AdminRoute";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Users from "./pages/admin/users";
import AdminPanel from "./pages/admin/adminPanel";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route element={<AdminRoute />}>
          {/*add admin routes in this route*/}
            <Route path="/sportsManagment" element={<SportsManagment />} />
            <Route path="/users" element={<Users />} />
            <Route path="/adminPanel" element={<AdminPanel />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
    
  );
}

export default App;
