import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";
import { Monitor, Smartphone, Trash2, Laptop, Globe } from "lucide-react";
import TableSkeleton from "../../components/Skeletons/TableSkeleton";

function formatDate(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function getBrowserLabel(userAgent) {
  if (!userAgent) return "Unknown browser";
  if (userAgent.includes("Edg/")) return "Microsoft Edge";
  if (userAgent.includes("Chrome/") && !userAgent.includes("Edg/"))
    return "Google Chrome";
  if (userAgent.includes("Firefox/")) return "Mozilla Firefox";
  if (userAgent.includes("Safari/") && userAgent.includes("Version/"))
    return "Safari";
  if (userAgent.includes("OPR/") || userAgent.includes("Opera/"))
    return "Opera";
  return "Browser";
}

function getDeviceLabel(userAgent) {
  if (!userAgent) return "Unknown device";
  if (/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)) return "Mobile";
  return "Desktop";
}

function getDeviceIcon(deviceLabel) {
  if (deviceLabel === "Mobile") return Smartphone;
  if (deviceLabel === "Desktop") return Monitor;
  return Laptop;
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
    const browserLabel = getBrowserLabel(s.userAgent);
    const deviceLabel = getDeviceLabel(s.userAgent);
    return (
      String(s.id).toLowerCase().includes(q) ||
      String(s.userId).toLowerCase().includes(q) ||
      (s.user?.email || "").toLowerCase().includes(q) ||
      ((s.user?.emri || "") + " " + (s.user?.mbiemri || ""))
        .toLowerCase()
        .includes(q) ||
      browserLabel.toLowerCase().includes(q) ||
      deviceLabel.toLowerCase().includes(q) ||
      (s.lastSeenAt || "").toLowerCase().includes(q) ||
      (s.createdAt || "").toLowerCase().includes(q) ||
      (s.expiresAt || "").toLowerCase().includes(q)
    );
  });

  if (!user?.is_admin && !loading) return <Navigate to="/" replace />;

  if (loading) {
    return (
      <div className="delay-skeleton">
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 dark:bg-transparent min-h-screen">
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
          <h2 className="text-2xl font-bold dark:text-slate-200">
            Active sessions
          </h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by id or userId"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 px-4 py-3 placeholder:text-transparent outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:placeholder:text-gray-400 dark:placeholder:text-slate-500"
            />
            <svg
              className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 dark:text-slate-500"
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
          <div className="delay-skeleton">
            <TableSkeleton />
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-screen">
            <p className="text-lg text-red-600">Error: {error}</p>
          </div>
        ) : (
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead className="bg-gray-800 dark:bg-slate-700 text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">User</th>
                  <th className="px-6 py-4 text-left font-semibold">Browser</th>
                  <th className="px-6 py-4 text-left font-semibold">Device</th>
                  <th className="px-6 py-4 text-left font-semibold">
                    Created At
                  </th>
                  <th className="px-6 py-4 text-left font-semibold">
                    Last Seen
                  </th>
                  <th className="px-6 py-4 text-left font-semibold">
                    Expires At
                  </th>
                  <th className="px-6 py-4 text-center font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-gray-500 dark:text-slate-400"
                    >
                      No sessions found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 text-gray-800 dark:text-slate-200 font-medium">
                        {s.user?.email
                          ? `${s.user.emri} ${s.user.mbiemri} — ${s.user.email}`
                          : s.userId}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-slate-200">
                        {getBrowserLabel(s.userAgent)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <span className="inline-flex items-center gap-2 dark:text-slate-200">
                          {(() => {
                            const DeviceIcon = getDeviceIcon(
                              getDeviceLabel(s.userAgent),
                            );
                            return (
                              <DeviceIcon size={15} className="shrink-0" />
                            );
                          })()}
                          {getDeviceLabel(s.userAgent)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-slate-200">
                        {formatDate(s.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-slate-200">
                        {formatDate(s.lastSeenAt)}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-slate-200">
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

        {/* DELETE SESSION MODAL */}
        {showDeleteModal && selectedSession && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4 backdrop-blur-sm"
            onClick={handleDeleteCancel}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-4 text-2xl font-bold text-red-600 dark:text-red-400">
                Confirm delete
              </h3>
              <p className="mb-6 text-gray-700 dark:text-slate-300">
                Delete session{" "}
                <strong className="break-all text-gray-900 dark:text-slate-100">
                  {selectedSession.user?.id
                    ? `${selectedSession.user.emri} ${selectedSession.user.mbiemri} — ${selectedSession.user.email}`
                    : selectedSession.userId}
                </strong>{" "}
              </p>
              <p className="mb-6 text-sm text-gray-600 dark:text-slate-400">
                Browser: {getBrowserLabel(selectedSession.userAgent)} | Device:{" "}
                {getDeviceLabel(selectedSession.userAgent)}
              </p>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 rounded-lg bg-red-500 py-2 font-semibold text-white transition duration-200 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  onClick={handleDeleteCancel}
                  className="flex-1 rounded-lg bg-gray-400 py-2 font-semibold text-white transition duration-200 hover:bg-gray-500 dark:bg-slate-700 dark:hover:bg-slate-600"
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
