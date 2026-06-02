import { useContext, useState } from "react";
import { Navigate ,Link, Outlet } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import {
  LogOut,
  Menu,
  LayoutDashboard,
  ClipboardList,
  Swords,
  ShieldPlus,
  Radio,
  ListOrdered,
  GitBranch,
} from "lucide-react";

const OrganizerLayout = () => {
  const { user, logout, } = useContext(AuthContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

return (
  <div className="flex h-screen md:h-[calc(100vh-80px)] bg-gray-100 dark:bg-slate-900 overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <aside
        className={`w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col justify-between shrink-0 transition-all duration-300 ${isSidebarOpen ? "ml-0" : "-ml-64 hidden md:flex md:-ml-64 md:hidden"} ${!isSidebarOpen && "hidden"}`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-400 dark:text-slate-300 uppercase tracking-widest">
              Organizer Pages
            </h2>
            <button
              // Collapses the sidebar in the current layout.
              onClick={() => setIsSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors p-1"
              aria-label="Close Sidebar"
            >
              <Menu size={20} />
            </button>
          </div>
          <nav className="space-y-1 h-110 overflow-y-auto sticky top-0 pb-4">
            {/* Overview */}
            <Link
              to="/organizer/dashboard"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 rounded-lg font-medium transition-colors mb-2"
            >
              <LayoutDashboard size={20} />
              Dashboard
            </Link>
            {/* Competitions */}
            <div className="px-4 pt-4 pb-2">
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-300 uppercase tracking-wider">Competitions</p>
            </div>
            <Link
              to="/organizer/tournaments"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 rounded-lg font-medium transition-colors"
            >
              <ClipboardList size={20} />
              Tournaments
            </Link>
            <Link
              to="/organizer/matches"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 rounded-lg font-medium transition-colors"
            >
              <Swords size={20} />
              Matches
            </Link>
            <Link
              to="/organizer/live-matches"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 rounded-lg font-medium transition-colors"
            >
              <Radio size={20} />
              Live Matches
            </Link>
            <Link
              to="/organizer/standings"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 rounded-lg font-medium transition-colors"
            >
              <ListOrdered size={20} />
              Standings
            </Link>
            <Link
              to="/organizer/brackets"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 rounded-lg font-medium transition-colors"
            >
              <GitBranch size={20} />
              Brackets
            </Link>
            {/* New organizer section for adding/removing teams inside the assigned tournament. */}
            {/* Management */}
            <div className="px-4 pt-4 pb-2">
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-300 uppercase tracking-wider">Management</p>
            </div>
            <Link
              to="/organizer/teams"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 rounded-lg font-medium transition-colors"
            >
              <ShieldPlus size={20} />
              Teams
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
              <p className="text-xs text-gray-500 dark:text-slate-400">Organizer</p>
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
      <main className="flex-1 p-6 md:p-8 overflow-y-auto w-full transition-all flex flex-col">
        {!isSidebarOpen && (
          <div className="mb-4 shrink-0">
            <button
              // Re-opens the sidebar when it is hidden.
              onClick={() => setIsSidebarOpen(true)}
              className="p-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm text-gray-600 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100 transition-colors"
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

export default OrganizerLayout;
