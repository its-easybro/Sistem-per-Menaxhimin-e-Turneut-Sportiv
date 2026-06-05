import { useContext } from "react";
import AuthContext from "../../context/AuthContext";
import { Link } from "react-router-dom";

// Renders a dashboard with quick links for the organizer to manage their assigned tournaments.
export default function OrganizerDashboard() {
  const { user } = useContext(AuthContext);

  return (
    // Container for the dashboard content, with padding and responsive design.
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
        Organizer Dashboard
      </h1>
      <p className="mt-2 text-gray-600 dark:text-slate-400">
        Welcome {user?.full_name || user?.username || "Organizer"}. Choose a
        section to manage your tournament work.
      </p>

      {/* Quick Links */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Link
          to="/organizer/tournaments"
          className="group block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-400/50"
        >
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Quick Link
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="font-semibold text-gray-900 dark:text-slate-100">
              Manage Tournaments
            </p>
            <span className="text-gray-400 transition-all duration-200 group-hover:translate-x-1 group-hover:text-blue-500 dark:text-slate-500 dark:group-hover:text-blue-300">
              -&gt;
            </span>
          </div>
        </Link>

        {/* Manage Matches */}
        <Link
          to="/organizer/matches"
          className="group block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-amber-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-400/60"
        >
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Quick Link
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="font-semibold text-gray-900 dark:text-slate-100">
              Manage Matches
            </p>
            <span className="text-gray-400 transition-all duration-200 group-hover:translate-x-1 group-hover:text-amber-500 dark:text-slate-500 dark:group-hover:text-amber-300">
              -&gt;
            </span>
          </div>
        </Link>

        {/* Manage Teams */}
        <Link
          to="/organizer/teams"
          className="group block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-400/60"
        >
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Quick Link
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="font-semibold text-gray-900 dark:text-slate-100">
              Manage Teams
            </p>
            <span className="text-gray-400 transition-all duration-200 group-hover:translate-x-1 group-hover:text-emerald-500 dark:text-slate-500 dark:group-hover:text-emerald-300">
              -&gt;
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
