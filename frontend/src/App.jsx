import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useContext } from "react";
import AuthContext from "./context/AuthContext";

import SportsManagment from "./pages/admin/SportsManagment";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminRoute from "./components/AdminRoute";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Users from "./pages/admin/users";
import AdminPanel from "./pages/admin/adminPanel";
import Players from "./pages/admin/Players";
import Venues from "./pages/admin/venues";
import Teams from "./pages/admin/Teams";

function App() {
  const { loading } = useContext(AuthContext);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route element={<AdminRoute />}>
        {/*add admin routes in this route*/}
          <Route path="players" element={<Players />} />
          <Route path="/sportsManagment" element={<SportsManagment />} />
          <Route path="/users" element={<Users />} />
          <Route path="/adminPanel" element={<AdminPanel />} />
          <Route path="/venues" element={<Venues />} />
          <Route path="/teams" element={<Teams />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
