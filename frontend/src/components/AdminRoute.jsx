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
} from "lucide-react";

const AdminRoute = () => {
  const { user, loading, logout } = useContext(AuthContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user || (!user.is_admin && user.is_admin !== true)) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex h-screen md:h-[calc(100vh-80px)] bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`w-64 bg-white border-r border-gray-200 flex flex-col justify-between shrink-0 transition-all duration-300 ${isSidebarOpen ? "ml-0" : "-ml-64 hidden md:flex md:-ml-64 md:hidden"} ${!isSidebarOpen && "hidden"}`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Admin Pages
            </h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              aria-label="Close Sidebar"
            >
              <Menu size={20} />
            </button>
          </div>
          <nav className="space-y-2">
            <Link to="/adminPanel" className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg font-medium transition-colors">
              <LayoutDashboard size={20} />
              Dashboard
            </Link>
            <Link to="/sportsManagment" className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg font-medium transition-colors">
              <Trophy size={20} />
              Sports Management
            </Link>
            <Link
              to="/users"
              className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg font-medium transition-colors"
            >
              <Users size={20} />
              User Directory
            </Link>
            <Link
              to="/players"
              className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg font-medium transition-colors"
            >
              <Volleyball size={20} />
              Players
            </Link>
            <Link
              to="/venues"
              className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg font-medium transition-colors"
            >
              <LandPlot size={20} />
              Venues
            </Link>
            <Link to="/Teams" className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg font-medium transition-colors">
             <ShieldHalf size={20} />
              Teams
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
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
          </div>
          <button
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
              onClick={() => setIsSidebarOpen(true)}
              className="p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              aria-label="Open Sidebar"
            >
              <Menu size={24} />
            </button>
          </div>
        )}
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminRoute;
