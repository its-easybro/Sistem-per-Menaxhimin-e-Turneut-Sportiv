import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

import SportsManagment from "./pages/admin/SportsManagment";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { AuthProvider } from "./context/AuthContext";
import AdminRoute from "./components/AdminRoute";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Users from "./pages/admin/users";


axios.defaults.withCredentials = true;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  <Route element={<AdminRoute />}>
  <Route path="/sportsManagment" element={<SportsManagment />} />
  <Route path="/users" element={<Users />} />
</Route>


  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/auth/me");
        setUser(res.data);
      } catch (err) {
        setUser(null);
        console.log(err.message);
      } finally{
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  if(loading){
    return <div>Loading...</div>
  }

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
          </Route>
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register setUser={setUser}/>} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
    
  );
}

export default App;
