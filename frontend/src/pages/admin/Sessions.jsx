import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";
import { Monitor, Smartphone, Trash2, Laptop, Search, SlidersHorizontal } from "lucide-react";
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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({ browser: "", device: "", search: "" });
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

  // Implements debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setFilters((prev) =>
        prev.search === searchQuery ? prev : { ...prev, search: searchQuery }
      );
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handles filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // Clear filters handler
  const handleClearFilters = () => {
    setSearchQuery("");
    setFilters({ browser: "", device: "", search: "" });
  };

  const hasActiveFilters = filters.browser !== "" || filters.device !== "" || filters.search !== "";

  // Get unique browsers and devices from sessions
  const uniqueBrowsers = [...new Set(sessions.map((s) => getBrowserLabel(s.userAgent)))].sort();
  const uniqueDevices = [...new Set(sessions.map((s) => getDeviceLabel(s.userAgent)))].sort();

  const filtered = sessions.filter((s) => {
    const q = debouncedSearch.toLowerCase();
    const browserLabel = getBrowserLabel(s.userAgent);
    const deviceLabel = getDeviceLabel(s.userAgent);

    const matchesSearch =
      !q ||
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
      (s.expiresAt || "").toLowerCase().includes(q);

    const matchesBrowser = !filters.browser || browserLabel === filters.browser;
    const matchesDevice = !filters.device || deviceLabel === filters.device;

    return matchesSearch && matchesBrowser && matchesDevice;
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4">
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="w-full mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-6">
            Active Sessions
          </h2>

          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 md:relative">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 min-w-0 max-w-3xl">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search
                    size={18}
                    className="text-gray-400 dark:text-gray-500"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Search by user, email, device..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder-gray-400"
                />
              </div>

              <div className="relative min-w-[160px]">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <SlidersHorizontal size={14} />
                </div>
                <select
                  name="browser"
                  value={filters.browser}
                  onChange={handleFilterChange}
                  className="w-full pl-9 pr-8 py-2 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer font-medium transition-all"
                >
                  <option value="">All Browsers</option>
                  {uniqueBrowsers.map((browser) => (
                    <option key={browser} value={browser}>
                      {browser}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              <div className="relative min-w-[160px]">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <SlidersHorizontal size={14} />
                </div>
                <select
                  name="device"
                  value={filters.device}
                  onChange={handleFilterChange}
                  className="w-full pl-9 pr-8 py-2 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer font-medium transition-all"
                >
                  <option value="">All Devices</option>
                  {uniqueDevices.map((device) => (
                    <option key={device} value={device}>
                      {device}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="text-xs font-semibold text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-all flex items-center justify-center gap-1 shrink-0 animate-in fade-in slide-in-from-left-2 duration-200 cursor-pointer md:absolute md:left-[calc(100%-13rem)] md:top-1/2 md:-translate-y-1/2 md:ml-0"
                >
                  Clear
                </button>
              )}
            </div>
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
          <div className="flex-1 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg shadow-md overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead className="bg-gray-800 dark:bg-slate-800 text-white">
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
              <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-6 text-center text-gray-500 dark:text-slate-400"
                    >
                      No sessions found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 text-gray-800 dark:text-slate-200 font-medium">
                        {s.user?.email
                          ? `${s.user.emri} ${s.user.mbiemri} — ${s.user.email}`
                          : s.userId}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-slate-300">
                        {getBrowserLabel(s.userAgent)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <span className="inline-flex items-center gap-2 dark:text-slate-300">
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
                      <td className="px-6 py-4 text-gray-600 dark:text-slate-300">
                        {formatDate(s.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-slate-300">
                        {formatDate(s.lastSeenAt)}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-slate-300">
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
