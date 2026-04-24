import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useContext } from "react";
import AuthContext from "./context/AuthContext";

// Route Protection
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminLayout";
import OrganizerLayout from "./components/OrganizerLayout";
import RefereeLayout from "./components/RefereeLayout";

// Importing Admin Pages
import Sports from "./pages/admin/Sports";
import Matches from "./pages/admin/matches";
import Teams from "./pages/admin/Teams";
import Home from "./pages/Users/Home";
import Users from "./pages/admin/users";
import Dashboard from "./pages/admin/Dashboard";
import Players from "./pages/admin/Players";
import Venues from "./pages/admin/venues";
import MatchResults from "./pages/admin/MatchResults";
import MatchReferees from "./pages/admin/MatchReferees";
import Tournaments from "./pages/admin/Tournaments";
import Referees from "./pages/admin/Referees";
import Standings from "./pages/admin/Standings";
import OrganizerDashboard from "./pages/organizator/Dashboard";
import RefereeDashboard from "./pages/gjyqtar/Dashboard";

// Importing User Pages
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Login from "./pages/Users/Login";
import Register from "./pages/Users/Register";
import AboutUs from "./pages/Users/AboutUs";
import ContactUs from "./pages/Users/ContactUs";

function App() {
  // Waits for initial auth/session check before rendering app routes.
  const { loading } = useContext(AuthContext);

  if (loading) {
    // Prevents route flicker while user auth state is still being resolved.
    return <div>Loading...</div>;
  }

  return (
    // Enables client-side routing across all pages.
    <BrowserRouter>
      {/* Shared top navigation shown on all routes. */}
      <Navbar />
      <Routes>
        {/* Public routes. */}
        <Route path="/" element={<Home />} />
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/contact-us" element={<ContactUs />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ADMIN ROUTES */}
        <Route element={<ProtectedRoute requiredRoles={["is_admin"]} Layout={AdminRoute} />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/players" element={<Players />} />
          <Route path="/sports" element={<Sports />} />
          <Route path="/users" element={<Users />} />
          <Route path="/venues" element={<Venues />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/match-results" element={<MatchResults />} />
          <Route path="/match-referees" element={<MatchReferees />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/referees" element={<Referees />} />
          <Route path="/standings" element={<Standings />} />
        </Route>

        {/* ORGANIZER ROUTES */}
        <Route element={<ProtectedRoute requiredRoles={["is_organizer"]} Layout={OrganizerLayout} />}>
          <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
          <Route path="/organizer/tournaments" element={<Tournaments />} />
          <Route path="/organizer/matches" element={<Matches />} />
          <Route path="/organizer/standings" element={<Standings />} />
        </Route>

        {/* REFEREE ROUTES */}
        <Route element={<ProtectedRoute requiredRoles={["is_referee"]} Layout={RefereeLayout} />}>
          <Route path="/referee/dashboard" element={<RefereeDashboard />} />
          <Route path="/referee/matches" element={<Matches />} />
          <Route path="/referee/match-results" element={<MatchResults />} />
        </Route>
      </Routes>
      {/* Shared footer shown on all routes. */}
      <Footer />
    </BrowserRouter>
  );
}

export default App;
