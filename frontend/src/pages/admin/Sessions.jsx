import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";
import { Trash2 } from "lucide-react";

function formatDate(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export default function Sessions() {
  const { user } = useContext(AuthContext);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.is_admin) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await api.get("/sessions");
        setSessions(res.data || []);
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err.message ||
          "Failed to load sessions";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const handleDelete = (id) => {
    const s = sessions.find((x) => x.id === id) || { id };
    setSelectedSession(s);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSession) return;
    try {
      await api.delete(`/sessions/${selectedSession.id}`);
      setSessions((prev) => prev.filter((t) => t.id !== selectedSession.id));
      setAlert({ type: "success", message: "Session deleted." });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err.message ||
        "Failed to delete session";
      setAlert({ type: "error", message: msg });
    } finally {
      setShowDeleteModal(false);
      setSelectedSession(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setSelectedSession(null);
  };

  const filtered = sessions.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(s.id).toLowerCase().includes(q) ||
      String(s.userId).toLowerCase().includes(q) ||
      (s.user?.email || "").toLowerCase().includes(q) ||
      ((s.user?.emri || "") + " " + (s.user?.mbiemri || ""))
        .toLowerCase()
        .includes(q) ||
      (s.createdAt || "").toLowerCase().includes(q) ||
      (s.expiresAt || "").toLowerCase().includes(q)
    );
  });

  if (!user?.is_admin && !loading) return <Navigate to="/" replace />;

  function renderSkeleton() {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="w-full mx-auto animate-pulse">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <div className="h-8 bg-gray-300 rounded w-64"></div>
              <div className="h-10 bg-gray-300 rounded w-32"></div>
            </div>
            <div className="relative">
              <div className="h-12 bg-gray-300 rounded-lg w-full"></div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-4">
                    <div className="h-4 bg-gray-600 rounded w-8"></div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="h-4 bg-gray-600 rounded w-32"></div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="h-4 bg-gray-600 rounded w-24"></div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="h-4 bg-gray-600 rounded w-32"></div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="h-4 bg-gray-600 rounded w-12"></div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="h-4 bg-gray-600 rounded w-32"></div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="h-4 bg-gray-600 rounded w-20 mx-auto"></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...Array(5)].map((_, index) => (
                  <tr key={index} className="bg-white">
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-10"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-40"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-8"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6"></div>
          <h2 className="text-2xl font-bold">Active sessions</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by id or userId"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-transparent sm:placeholder:text-gray-400"
            />
            <svg
              className="absolute right-3 top-3.5 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
        {loading ? (
          renderSkeleton()
        ) : error ? (
          <div className="flex justify-center items-center h-screen">
            <p className="text-lg text-red-600">Error: {error}</p>
          </div>
        ) : (
          <div className="flex-1 bg-white rounded-lg shadow-md overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-6 py-4 text-center font-semibold">ID</th>
                  <th className="px-6 py-4 text-left font-semibold">User</th>
                  <th className="px-6 py-4 text-left font-semibold">Created At</th>
                  <th className="px-6 py-4 text-left font-semibold">Expires At</th>
                  <th className="px-6 py-4 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-gray-500"
                    >
                      No sessions found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-100 transition-colors duration-150">
                      <td className="px-6 py-4 text-gray-500 text-center">{s.id}</td>
                      <td className="px-6 py-4 text-gray-800 font-medium">
                        {s.user?.email
                          ? `${s.user.emri} ${s.user.mbiemri} — ${s.user.email}`
                          : s.userId}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(s.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(s.expiresAt)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded text-sm font-medium transition duration-200"
                        >
                          <Trash2 size={16} />
                        </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Delete modal */}
        {showDeleteModal && selectedSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleDeleteCancel}
          >
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-red-600 mb-4">Confirm delete</h3>
              <p className="text-gray-700 mb-6">
                Delete session{" "}
                <strong className="break-all">{selectedSession.id}</strong>{" "}
                (userId: {selectedSession.userId})?
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-lg transition duration-200"
                >
                  Delete
                </button>
                <button
                  onClick={handleDeleteCancel}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
