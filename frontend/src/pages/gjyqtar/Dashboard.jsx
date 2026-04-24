import { useContext } from "react";
import AuthContext from "../../context/AuthContext";

export default function RefereeDashboard() {
  const { user } = useContext(AuthContext);

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-gray-900">Referee Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Welcome {user?.full_name || user?.username || "Referee"}. This is a basic referee workspace.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Quick Link</p>
          <p className="mt-1 font-semibold text-gray-900">Assigned Matches</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Quick Link</p>
          <p className="mt-1 font-semibold text-gray-900">Submit Match Results</p>
        </div>
      </div>
    </div>
  );
}