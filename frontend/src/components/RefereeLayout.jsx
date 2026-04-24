import { useContext, useState } from "react";
import { Link, Navigate, Outlet } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import { LogOut, Menu, Award, LayoutDashboard, Swords, Flag } from "lucide-react";

const RefereeLayout = () => {
  const { user, logout} = useContext(AuthContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

return (
    <div className="flex h-screen md:h-[calc(100vh-80px)] bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`w-64 bg-white border-r border-gray-200 flex flex-col justify-between shrink-0 transition-all duration-300 ${isSidebarOpen ? "ml-0" : "-ml-64 hidden md:flex md:-ml-64 md:hidden"} ${!isSidebarOpen && "hidden"}`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Referee Pages
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
          <nav className="space-y-2 h-110 overflow-y-auto sticky top-0">
            <Link
              to="/referee/dashboard"
              className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg font-medium transition-colors"
            >
              <LayoutDashboard size={20} />
              Dashboard
            </Link>
            <Link
              to="/referee/matches"
              className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg font-medium transition-colors"
            >
              <Swords size={20} />
              My Matches
            </Link>
            <Link
              to="/referee/match-results"
              className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg font-medium transition-colors"
            >
              <Flag size={20} />
              Match Results
            </Link>
          </nav>
        </div>

        {/* User Profile / Logout */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold shadow-sm">
              {user.emri ? user.emri.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="truncate">
              <p className="text-sm font-bold text-gray-900 truncate">
                {user.full_name || user.username || user.email}
              </p>
              <p className="text-xs text-gray-500">Referee</p>
            </div>
          </div>
          <button
            // Ends session and clears local auth state via context.
            onClick={logout}
            className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-bold w-full px-2 py-2 rounded-lg hover:bg-red-50 transition-colors"
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
              className="p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
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

export default RefereeLayout;
