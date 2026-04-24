import { useContext } from "react";
import AuthContext from "../../context/AuthContext";

export default function OrganizerDashboard() {
  const { user } = useContext(AuthContext);

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-gray-900">Organizer Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Welcome {user?.full_name || user?.username || "Organizer"}. This is a basic organizer workspace.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Quick Link</p>
          <p className="mt-1 font-semibold text-gray-900">Manage Tournaments</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Quick Link</p>
          <p className="mt-1 font-semibold text-gray-900">Manage Matches</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Quick Link</p>
          <p className="mt-1 font-semibold text-gray-900">View Standings</p>
        </div>
      </div>
    </div>
  );
}