import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useContext } from "react";
import AuthContext from "./context/AuthContext";

// Importing Admin Pages
import Sports from "./pages/admin/Sports";
import AdminRoute from "./components/AdminRoute";
import Matches from "./pages/admin/matches";
import Teams from "./pages/admin/Teams";
import Home from "./pages/Users/Home";
import Users from "./pages/admin/users";
import Dashboard from "./pages/admin/Dashboard";
import Players from "./pages/admin/Players";
import Venues from "./pages/admin/venues";
import MatchResults from "./pages/admin/MatchResults";

// Importing User Pages
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Login from "./pages/Users/Login";
import Register from "./pages/Users/Register";
import AboutUs from "./pages/Users/AboutUs";


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
        <Route path="/about-us" element={<AboutUs />} />
        <Route element={<AdminRoute />}>
        {/*add admin routes in this route*/}
          <Route path="/players" element={<Players />} />
          <Route path="/sports" element={<Sports />} />
          <Route path="/users" element={<Users />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/venues" element={<Venues />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/match-results" element={<MatchResults />}/>
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
