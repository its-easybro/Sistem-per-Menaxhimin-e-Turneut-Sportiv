import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useContext, lazy, Suspense } from "react";
import AuthContext from "./context/AuthContext";

// Route Protection
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminLayout";
import OrganizerLayout from "./components/OrganizerLayout";
import RefereeLayout from "./components/RefereeLayout";

// Skeleton loaders importer
import CardSkeleton from "./components/Skeletons/CardSkeleton"
import TableSkeleton from "./components/Skeletons/TableSkeleton"
import PageLoader from "./components/Skeletons/PageLoader"

// Importing Admin Pages
const Sports = lazy(() => import("./pages/admin/Sports"))
const Matches = lazy(() => import("./pages/admin/matches"))
const Teams = lazy(() => import("./pages/admin/Teams"))
const Users = lazy(() => import("./pages/admin/Users"))
const Dashboard = lazy(() => import("./pages/admin/Dashboard"))
const Players = lazy(() => import("./pages/admin/Players"))
const Venues = lazy(() => import("./pages/admin/Venues"))
const MatchResults = lazy(() => import("./pages/admin/MatchResults"))
const MatchReferees = lazy(() => import("./pages/admin/MatchReferees"))
const Tournaments = lazy(() => import("./pages/admin/Tournaments"))
const Referees = lazy(() => import("./pages/admin/Referees"))
const Standings = lazy(() => import("./pages/admin/Standings"))
const ContactUs = lazy(() => import("./pages/admin/ContactUs"))
const Sessions = lazy(() => import("./pages/admin/Sessions"))
const Brackets = lazy(() => import("./pages/admin/Brackets"))

// Importing Organizer Pages
const OrganizerDashboard = lazy(() => import("./pages/organizator/Dashboard"))
const OrganizerMatches = lazy(() => import("./pages/organizator/Matches"))
const OrganizerTeams = lazy(() => import("./pages/organizator/Teams"))
const RefereeDashboard = lazy(() => import("./pages/gjyqtar/Dashboard"))

// Importing User Pages
const Home = lazy(() => import("./pages/Users/Home"))
const Navbar = lazy(() => import("./components/Navbar"))
const Footer = lazy(() => import("./components/Footer"))
const NotFound = lazy(() => import("./components/NotFound"))
const Login = lazy(() => import("./pages/Users/Login"))
const Register = lazy(() => import("./pages/Users/Register"))
const AboutUs = lazy(() => import("./pages/Users/AboutUs"))
const UserContactUs = lazy(() => import("./pages/Users/ContactUs"))
const ForgotPassword = lazy(() => import("./pages/Users/ForgotPassword"))
const ResetPassword = lazy(() => import("./pages/Users/ResetPassword"))
const LiveMatches = lazy(() => import("./pages/Users/LiveMatches"))
const PublicLiveMatch = lazy(() => import("./pages/Users/PublicLiveMatch"))
const PublicStandings = lazy(() => import("./pages/Users/PublicStandings"))
const PublicBrackets = lazy(() => import("./pages/Users/PublicBrackets"))
const Profile = lazy(() => import("./pages/Users/Profile"))

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
      <Suspense fallback={<PageLoader />}>
      {/* Shared top navigation shown on all routes. */}
      <Navbar />
      <Routes>
        {/* Public routes. */}
        <Route path="/" element={<Home />} />
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/contact-us" element={<UserContactUs />} />
        <Route path="/login" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* Public live routes show the viewer, while role routes below keep staff controls protected. */}
        <Route path="/live-matches" element={<PublicLiveMatch />} />
        <Route path="/live-matches/:id" element={<PublicLiveMatch />} />
        <Route path="/public/standings" element={<PublicStandings />} />
        {/* /brackets stays public; admin editing is kept on /admin/brackets. */}
        <Route path="/brackets" element={<PublicBrackets />} />
        <Route path="/public/brackets" element={<PublicBrackets />} />

        {/* Authenticated profile route available to every signed-in user. */}
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
        </Route>

        {/* ADMIN ROUTES */}
        <Route element={<ProtectedRoute requiredRoles={["is_admin"]} Layout={AdminRoute} />}>
          <Route path="/dashboard" element={<Suspense fallback={<TableSkeleton />}> <Dashboard /> </Suspense>}/>
          <Route path="/players" element={<Suspense fallback={<TableSkeleton />}><Players /></Suspense>}/>
          <Route path="/sports" element={<Suspense fallback={<TableSkeleton />}><Sports /></Suspense>}/>
          <Route path="/users" element={<Suspense fallback={<TableSkeleton />}> <Users /></Suspense>}/>
          <Route path="/venues" element={<Suspense fallback={<TableSkeleton />}><Venues /></Suspense>}/>
          <Route path="/matches" element={<Suspense fallback={<TableSkeleton />}><Matches /></Suspense>}/>
          <Route path="/admin/live-matches" element={<Suspense fallback={<TableSkeleton />}><LiveMatches /></Suspense>}/>
          <Route path="/teams" element={<Suspense fallback={<TableSkeleton />}><Teams /></Suspense>}/>
          <Route path="/match-results" element={<Suspense fallback={<TableSkeleton />}><MatchResults /></Suspense>}/>
          <Route path="/match-referees" element={<Suspense fallback={<TableSkeleton />}><MatchReferees /></Suspense>}/>
          <Route path="/tournaments" element={<Suspense fallback={<TableSkeleton />}><Tournaments /></Suspense>}/>
          <Route path="/referees" element={<Suspense fallback={<TableSkeleton />}><Referees /></Suspense>}/>
          <Route path="/standings" element={<Suspense fallback={<TableSkeleton />}><Standings /></Suspense>}/>
          <Route path="/admin/brackets" element={<Suspense fallback={<TableSkeleton />}><Brackets /></Suspense>}/>
          <Route path="/contactUs" element={<Suspense fallback={<TableSkeleton />}><ContactUs /></Suspense>}/>
          <Route path="/sessions" element={<Suspense fallback={<TableSkeleton />}><Sessions /></Suspense>}/>
        </Route>

        {/* ORGANIZER ROUTES */}
        <Route element={<ProtectedRoute requiredRoles={["is_organizer"]} Layout={OrganizerLayout} />}>
          <Route path="/organizer/dashboard" element={<Suspense fallback={<TableSkeleton />}><OrganizerDashboard /></Suspense>}/>
          {/* Organizer reuses tournament page but now gets only assigned tournaments from the backend. */}
          <Route path="/organizer/tournaments" element={<Suspense fallback={<TableSkeleton />}><Tournaments /></Suspense>}/>
          {/* Dedicated organizer pages for match scheduling and team registration inside owned tournaments. */}
          <Route path="/organizer/matches" element={<Suspense fallback={<TableSkeleton />}><OrganizerMatches /></Suspense>}/>
          <Route path="/organizer/live-matches" element={<Suspense fallback={<TableSkeleton />}><LiveMatches /></Suspense>}/>
          <Route path="/organizer/teams" element={<Suspense fallback={<TableSkeleton />}><OrganizerTeams /></Suspense>}/>
          <Route path="/organizer/standings" element={<Suspense fallback={<TableSkeleton />}><Standings /></Suspense>}/>
          <Route path="/organizer/brackets" element={<Suspense fallback={<TableSkeleton />}><Brackets /></Suspense>}/>
        </Route>

        {/* REFEREE ROUTES */}
        <Route element={<ProtectedRoute requiredRoles={["is_referee"]} Layout={RefereeLayout} />}>
          <Route path="/referee/dashboard" element={<Suspense fallback={<TableSkeleton />}><RefereeDashboard /></Suspense>}/>
          <Route path="/referee/matches" element={<Suspense fallback={<TableSkeleton />}><MatchReferees /></Suspense>}/>
          <Route path="/referee/live-matches" element={<Suspense fallback={<TableSkeleton />}><LiveMatches /></Suspense>}/>
          <Route path="/referee/match-results" element={<Suspense fallback={<TableSkeleton />}><MatchResults /></Suspense>}/>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      {/* Shared footer shown on all routes. */}
      <Footer />
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
