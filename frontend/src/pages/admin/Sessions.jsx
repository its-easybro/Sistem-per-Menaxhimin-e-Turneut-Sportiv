import { useCallback, useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";
import { ChevronLeft, ChevronRight, Monitor, Smartphone, Trash2, Laptop, Search, SlidersHorizontal } from "lucide-react";
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

const browserFilterOptions = [
  "Microsoft Edge",
  "Google Chrome",
  "Mozilla Firefox",
  "Safari",
  "Opera",
  "Unknown browser",
];

const deviceFilterOptions = ["Desktop", "Mobile", "Unknown device"];

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
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);

  const loadSessions = useCallback(async (pageNum, filtersObj) => {
    if (!user?.is_admin) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pageNum,
        limit: 10,
      };
      const search = filtersObj.search.trim();

      if (search) params.search = search;
      if (filtersObj.browser) params.browser = filtersObj.browser;
      if (filtersObj.device) params.device = filtersObj.device;

      const res = await api.get("/sessions", { params });
      const sessionsPayload = res.data;
      const sessionsData = Array.isArray(sessionsPayload)
        ? sessionsPayload
        : sessionsPayload?.data ?? [];
      const paginationData = Array.isArray(sessionsPayload)
        ? null
        : sessionsPayload?.pagination ?? null;

      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      setPagination(paginationData);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err.message ||
        "Failed to load sessions";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSessions(page, filters);
  }, [loadSessions, page, filters]);

  const handleDelete = (id) => {
    const s = sessions.find((x) => x.id === id) || { id };
    setSelectedSession(s);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSession) return;
    try {
      await api.delete(`/sessions/${selectedSession.id}`);
      const nextPage = sessions.length === 1 && page > 1 ? page - 1 : page;

      if (nextPage !== page) {
        setPage(nextPage);
      } else {
        await loadSessions(page, filters);
      }
      setAlert({ type: "success", message: "Session deleted." });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
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
      const nextSearch = searchQuery.trim();

      setDebouncedSearch(nextSearch);
      setFilters((prev) => {
        if (prev.search === nextSearch) return prev;
        setPage(1);
        return { ...prev, search: nextSearch };
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handles filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setPage(1);
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // Clear filters handler
  const handleClearFilters = () => {
    setSearchQuery("");
    setPage(1);
    setFilters({ browser: "", device: "", search: "" });
  };

  const hasActiveFilters = filters.browser !== "" || filters.device !== "" || filters.search.trim() !== "";

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
                  {browserFilterOptions.map((browser) => (
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
                  {deviceFilterOptions.map((device) => (
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

              </div>
            
            {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-semibold text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-all flex items-center justify-center gap-1 shrink-0 animate-in fade-in slide-in-from-left-2 duration-200 cursor-pointer ml-auto sm:ml-0"
            >
              Clear Filters
            </button>
            )}
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
                {sessions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-6 text-center text-gray-500 dark:text-slate-400"
                    >
                      {debouncedSearch
                        ? `No sessions match "${debouncedSearch}". Try a different search.`
                        : "No sessions found."}
                    </td>
                  </tr>
                ) : (
                  sessions.map((s) => (
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

        {pagination && (
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl px-4 py-4 sm:px-6 flex items-center justify-between shadow-sm mt-4">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="relative inline-flex items-center rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                Close
              </button>
              <button
                disabled={page === pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="relative ml-3 inline-flex items-center rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                Forward
              </button>
            </div>

            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Page <span className="font-semibold text-gray-900 dark:text-white">{page}</span> from{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">{pagination.totalPages}</span>
                  {pagination.total ? (
                    <>
                      {" "}(Total <span className="font-semibold text-gray-900 dark:text-white">{pagination.total}</span> sessions)
                    </>
                  ) : null}
                </p>
              </div>

              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm gap-1" aria-label="Pagination">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="relative inline-flex items-center rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 focus:z-20 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  {Array.from({ length: pagination.totalPages }, (_, index) => {
                    const pageNum = index + 1;
                    const isActive = pageNum === page;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`relative inline-flex items-center justify-center min-w-[36px] h-[36px] rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                          isActive
                            ? "bg-blue-600 text-white shadow-sm"
                            : "border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    disabled={page === pagination.totalPages}
                    onClick={() => setPage(page + 1)}
                    className="relative inline-flex items-center rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 focus:z-20 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Next Page"
                  >
                    <ChevronRight size={18} />
                  </button>
                </nav>
              </div>
            </div>
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
