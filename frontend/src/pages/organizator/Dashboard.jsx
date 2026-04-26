import { useContext } from "react";
import AuthContext from "../../context/AuthContext";
import { Link } from "react-router-dom";

export default function OrganizerDashboard() {
  const { user } = useContext(AuthContext);

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-gray-900">Organizer Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Welcome {user?.full_name || user?.username || "Organizer"}. Choose a section to manage your tournament work.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Link
          to="/organizer/tournaments"
          className="group block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
        >
          <p className="text-sm text-gray-500">Quick Link</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="font-semibold text-gray-900">Manage Tournaments</p>
            <span className="text-gray-400 transition-all duration-200 group-hover:translate-x-1 group-hover:text-blue-500">
              -&gt;
            </span>
          </div>
        </Link>

        <Link
          to="/organizer/matches"
          className="group block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-amber-300 hover:shadow-md"
        >
          <p className="text-sm text-gray-500">Quick Link</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="font-semibold text-gray-900">Manage Matches</p>
            <span className="text-gray-400 transition-all duration-200 group-hover:translate-x-1 group-hover:text-amber-500">
              -&gt;
            </span>
          </div>
        </Link>

        <Link
          to="/organizer/teams"
          className="group block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md"
        >
          <p className="text-sm text-gray-500">Quick Link</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="font-semibold text-gray-900">Manage Teams</p>
            <span className="text-gray-400 transition-all duration-200 group-hover:translate-x-1 group-hover:text-emerald-500">
              -&gt;
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
