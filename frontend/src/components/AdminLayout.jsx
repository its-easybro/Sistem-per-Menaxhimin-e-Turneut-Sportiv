import { useContext, useState } from "react";
import { Navigate, Outlet, Link } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import {
  Users,
  Trophy,
  Volleyball,
  LandPlot,
  LayoutDashboard,
  LogOut,
  Menu,
  Swords,
  ShieldHalf,
  ClipboardList,
  Flag,
  CalendarRange,
  FlagTriangleRight,
  ListOrdered,
  Mail,
  Radio,
  Fingerprint
} from "lucide-react";

const AdminRoute = () => {
  // Reads auth/session state and logout action from the shared auth context.
  const { user, logout } = useContext(AuthContext);
  // Controls whether the left admin sidebar is visible.
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen md:h-[calc(100vh-80px)] dark:bg-slate-900 bg-gray-100 overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <aside
        className={`w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col justify-between shrink-0 transition-all duration-300 ${isSidebarOpen ? "ml-0" : "-ml-64 hidden md:flex md:-ml-64 md:hidden"} ${!isSidebarOpen && "hidden"}`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Admin Pages
            </h2>
            <button
              // Collapses the sidebar in the current layout.
              onClick={() => setIsSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              aria-label="Close Sidebar"
            >
              <Menu size={20} />
            </button>
          </div>
          <nav className="space-y-1 h-110 overflow-y-auto sticky top-0 pb-4">
            {/* Overview */}
            <Link
              to="/dashboard"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors mb-2"
            >
              <LayoutDashboard size={20} />
              Dashboard
            </Link>

            {/* Competitions */}
            <div className="px-4 pt-4 pb-2">
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-300 uppercase tracking-wider">Competitions</p>
            </div>
            <Link
              to="/tournaments"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
            >
              <CalendarRange size={20} />
              Tournaments
            </Link>
            <Link
              to="/matches"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
            >
              <Swords size={20} />
              Matches
            </Link>
            <Link
              to="/admin/live-matches"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
            >
              <Radio size={20} />
              Live Matches
            </Link>
            <Link
              to="/match-results"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
            >
              <ClipboardList size={20} />
              Match Results
            </Link>
            <Link
              to="/standings"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
            >
              <ListOrdered size={20} />
              Standings
            </Link>

            {/* Entities */}
            <div className="px-4 pt-4 pb-2">
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-300 uppercase tracking-wider">Entities</p>
            </div>
            <Link
              to="/sports"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
            >
              <Trophy size={20} />
              Sports
            </Link>
            <Link
              to="/teams"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
            >
              <ShieldHalf size={20} />
              Teams
            </Link>
            <Link
              to="/players"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
            >
              <Volleyball size={20} />
              Players
            </Link>
            <Link
              to="/venues"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
            >
              <LandPlot size={20} />
              Venues
            </Link>
            <Link
              to="/referees"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
            >
              <FlagTriangleRight size={20} />
              Referees
            </Link>
            <Link
              to="/match-referees"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
            >
              <Flag size={20} />
              Match Referees
            </Link>

            {/* System */}
            <div className="px-4 pt-4 pb-2">
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-300 uppercase tracking-wider">System</p>
            </div>
            <Link
              to="/users"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
            >
              <Users size={20} />
              User Directory
            </Link>

            <Link
              to="/sessions"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
            >
              <Fingerprint size={20} />
              Sessions
            </Link>

            <Link
              to="/contactUs"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
            >
              <Mail size={20} />
              Contact Us
            </Link>
          </nav>
        </div>

        {/* User Profile / Logout */}
        <div className="p-6 border-t border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-800 dark:bg-slate-700 flex items-center justify-center text-white font-bold shadow-sm">
              {user.emri ? user.emri.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="truncate">
              <p className="text-sm font-bold text-gray-900 dark:text-slate-200 truncate">
                {user.full_name || user.username || user.email}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Administrator</p>
            </div>
          </div>
          <button
            // Ends session and clears local auth state via context.
            onClick={logout}
            className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-bold w-full px-2 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto w-full transition-colors duration-300 flex flex-col">
        {!isSidebarOpen && (
          <div className="mb-4 shrink-0">
            <button
              // Re-opens the sidebar when it is hidden.
              onClick={() => setIsSidebarOpen(true)}
              className="p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-700 dark:hover:text-slate-100 transition-colors"
              aria-label="Open Sidebar"
            >
              <Menu size={24} />
            </button>
          </div>
        )}
        <div className="flex-1">
          {/* Renders child admin route content inside the protected layout. */}
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminRoute;
