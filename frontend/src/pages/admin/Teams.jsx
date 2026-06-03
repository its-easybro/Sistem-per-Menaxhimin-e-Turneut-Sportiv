import { useCallback, useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import * as yup from "yup";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { API_BASE_URL } from "../../config/api";
import { Alert } from "../../components/Alert";
import {
  Edit,
  Trash2,
  Eye,
  Plus,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import TableSkeleton from "../../components/Skeletons/TableSkeleton";

const formatDate = (isoDate) => {
  if (!isoDate) return "N/A";
  try {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "Invalid Date";
  }
};

const initialFormData = {
  emertimi: "",
  logoja: "",
  trajneri: "",
  kontakti: "",
  email: "",
  qyteti: "",
  data_themelimit: "",
  sporti_id: "",
};

const toDateInputValue = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const resolveTeamLogoUrl = (logoValue) => {
  if (!logoValue || typeof logoValue !== "string") return "";

  const trimmed = logoValue.trim();
  if (!trimmed) return "";

  // Handle legacy saved URLs that used /sports/uploads-teams.
  const migrated = trimmed.replace(
    "/sports/uploads-teams/",
    "/teams/uploads-teams/",
  );

  if (/^https?:\/\//i.test(migrated)) {
    return migrated;
  }

  if (migrated.startsWith("/teams/uploads-teams/")) {
    return `${API_BASE_URL}${migrated}`;
  }

  if (migrated.startsWith("/uploads-teams/")) {
    return `${API_BASE_URL}/teams${migrated}`;
  }

  return `${API_BASE_URL}/teams/uploads-teams/${migrated.replace(/^\/+/, "")}`;
};
const teamCreateSchema = yup.object().shape({
  emertimi: yup
    .string()
    .min(2, "Team name must be at least 2 characters")
    .required("Team name is required"),
  trajneri: yup.string().min(2, "Trainer name must be at least 2 characters"),
  kontakti: yup.string().min(6, "Contact must be at least 6 characters"),
  email: yup.string().email("Email must be valid"),
  qyteti: yup.string().min(2, "City must be at least 2 characters"),
  data_themelimit: yup.string(),
  sporti_id: yup.string().required("Sport is required"),
  logoja: yup.string(),
});

const teamUpdateSchema = yup.object().shape({
  emertimi: yup.string().min(2, "Team name must be at least 2 characters"),
  trajneri: yup.string(),
  kontakti: yup.string(),
  email: yup.string().email("Email must be valid"),
  qyteti: yup.string(),
  data_themelimit: yup.string(),
  sporti_id: yup.string(),
  logoja: yup.string(),
});
export default function Teams() {
  // Provides admin-only team CRUD with modal-driven forms.
  const { user, loading: authLoading } = useContext(AuthContext);
  const isAdmin = user?.is_admin;

  // Stores team list, active dialogs, selected row, and form values.
  const [teams, setTeams] = useState([]);
  const [sports, setSports] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [alert, setAlert] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    qyteti: "",
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append("logo", file);

    setUploading(true);
    try {
      const response = await api.post("/teams/upload-team-logo", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setFormData((prev) => ({ ...prev, logoja: response.data.url }));
    } catch {
      setAlert({ type: "error", message: "Failed to upload logo" });
    } finally {
      setUploading(false);
    }
  };

  const buildTeamPayload = () => ({
    emertimi: formData.emertimi.trim(),
    logoja: formData.logoja.trim(),
    trajneri: formData.trajneri.trim(),
    kontakti: formData.kontakti.trim(),
    email: formData.email.trim(),
    qyteti: formData.qyteti.trim(),
    data_themelimit: formData.data_themelimit || null,
    sporti_id: Number(formData.sporti_id),
  });

  // Loads team records and sport options after auth is ready and admin access is confirmed.
  const loadTeams = useCallback(
    async (pageNum, filtersObj) => {
      if (!isAdmin) {
        setLoading(false);
        setHasLoaded(true);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const params = { page: pageNum, limit: 5 };
        const search = filtersObj.search.trim();

        if (search) params.search = search;
        if (filtersObj.qyteti.trim()) params.qyteti = filtersObj.qyteti.trim();

        const [teamsResponse, sportsResponse] = await Promise.all([
          api.get(`/teams`, { params }),
          api.get(`/sports`),
        ]);

        const teamPayload = teamsResponse.data;
        const teamsData = Array.isArray(teamPayload)
          ? teamPayload
          : (teamPayload?.data ?? []);
        const paginationData = Array.isArray(teamPayload)
          ? null
          : (teamPayload?.pagination ?? null);

        setTeams(Array.isArray(teamsData) ? teamsData : []);
        setPagination(paginationData);
        setSports(
          Array.isArray(sportsResponse.data) ? sportsResponse.data : [],
        );

        // Extract all unique cities from teams and sort them
        const cities = teamsData
          .map((team) => team.qyteti)
          .filter(Boolean)
          .map((city) => city.trim())
          .filter(Boolean);

        const uniqueCities = Array.from(new Set(cities)).sort((a, b) =>
          a.localeCompare(b),
        );

        setCityOptions(uniqueCities);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        setHasLoaded(true);
      }
    },
    [isAdmin],
  );

  useEffect(() => {
    if (!authLoading) {
      loadTeams(page, filters);
    }
  }, [authLoading, page, filters, loadTeams]);

  const handleClearFilters = () => {
    setFilters({ search: "", qyteti: "" });
    setPage(1);
  };

  const hasActiveFilters =
    filters.search.trim() !== "" || filters.qyteti !== "";
  const handleCreate = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    try {
      await teamCreateSchema.validate(formData, { abortEarly: false });
      await api.post(`/teams`, buildTeamPayload());

      handleCloseModal();
      await loadTeams(1, filters);
      setPage(1);
      setAlert({ type: "success", message: "Team created successfully!" });
    } catch (err) {
      if (err.inner) {
        const validationErrors = {};
        err.inner.forEach((error) => {
          validationErrors[error.path] = error.message;
        });
        setFormErrors(validationErrors);
      } else {
        setAlert({
          type: "error",
          message:
            "Error creating team: " +
            (err.response?.data?.error || err.message),
        });
      }
    }
  };
  const handleCloseModal = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setShowModal(false);
  };

  const handleCloseEditModal = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setSelectedTeam(null);
    setShowEditModal(false);
  };

  const handleCloseViewModal = () => {
    setSelectedTeam(null);
    setShowViewModal(false);
  };

  const handleCloseDeleteModal = () => {
    setSelectedTeam(null);
    setShowDeleteModal(false);
  };

  const handleView = (id) => {
    const team = teams.find((e) => e.id === id);
    if (!team) return;

    setSelectedTeam(team);
    setShowViewModal(true);
  };
  const handleEdit = (id) => {
    const team = teams.find((e) => e.id === id);
    if (!team) return;

    setSelectedTeam(team);

    setFormData({
      emertimi: team.emertimi || "",
      logoja: team.logoja || "",
      trajneri: team.trajneri || "",
      kontakti: team.kontakti || "",
      email: team.email || "",
      qyteti: team.qyteti || "",
      data_themelimit: toDateInputValue(team.data_themelimit),
      sporti_id: team.sporti_id ? String(team.sporti_id) : "",
    });
    setShowEditModal(true);
  };

  const handleDelete = (id) => {
    const team = teams.find((e) => e.id === id);
    if (!team) return;

    setSelectedTeam(team);
    setShowDeleteModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTeam) return;
    setFormErrors({});

    try {
      await teamUpdateSchema.validate(formData, { abortEarly: false });
      await api.put(`/teams/${selectedTeam.id}`, buildTeamPayload());

      handleCloseEditModal();
      await loadTeams(page, filters);
      setAlert({ type: "success", message: "Team updated successfully!" });
    } catch (err) {
      if (err.inner) {
        const validationErrors = {};
        err.inner.forEach((error) => {
          validationErrors[error.path] = error.message;
        });
        setFormErrors(validationErrors);
      } else {
        setAlert({
          type: "error",
          message:
            "Error updating team: " +
            (err.response?.data?.error || err.message),
        });
      }
    }
  };
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    setPage(1);
  };
  const handleDeleteConfirm = async () => {
    if (!selectedTeam) return;
    try {
      await api.delete(`/teams/${selectedTeam.id}`);

      handleCloseDeleteModal();
      await loadTeams(page > 1 ? page - 1 : 1, filters);
      if (page > 1) setPage(page - 1);
      setAlert({ type: "success", message: "Team deleted successfully!" });
    } catch (err) {
      setAlert({
        type: "error",
        message:
          "Error deleting team: " + (err.response?.data?.error || err.message),
      });
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg text-gray-600 dark:text-slate-400">
          Checking access...
        </p>
      </div>
    );
  }

  // Redirects non-admin users away from protected team management.
  if (!user || !user.is_admin) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="delay-skeleton">
        <TableSkeleton />
      </div>
    );
  }

  if (error)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg text-red-600 dark:text-red-400">Error: {error}</p>
      </div>
    );
  const filteredTeams = teams;

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
            Team Management
          </h2>

          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 min-w-0 max-w-2xl">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search
                    size={18}
                    className="text-gray-400 dark:text-gray-500"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Search by team name..."
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder-gray-400"
                />
              </div>

              <div className="relative min-w-[160px]">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <SlidersHorizontal size={14} />
                </div>
                <select
                  name="qyteti"
                  value={filters.qyteti}
                  onChange={handleFilterChange}
                  className="w-full pl-9 pr-8 py-2 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer font-medium transition-all"
                >
                  <option value="">All Cities</option>
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>
                      {city}
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
                  type="button"
                  onClick={handleClearFilters}
                  className="text-xs font-semibold text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-all flex items-center justify-center gap-1 shrink-0"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 hover:shadow active:scale-[0.98]"
            >
              <Plus size={18} />
              Add Team
            </button>
          </div>
        </div>

        {/* Team table section */}
        <div className="flex-1 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead className="bg-gray-800 dark:bg-slate-800 text-white">
              <tr>
                <th className="px-6 py-4 text-center font-semibold">ID</th>
                <th className="px-6 py-4 text-left font-semibold">Team Name</th>
                <th className="px-6 py-4 text-left font-semibold">Trainer</th>
                <th className="px-6 py-4 text-left font-semibold">Contact</th>
                <th className="px-6 py-4 text-left font-semibold">Email</th>
                <th className="px-6 py-4 text-left font-semibold">City</th>
                <th className="px-6 py-4 text-left font-semibold">Sport</th>
                <th className="px-6 py-4 text-center font-semibold">
                  Founded Date
                </th>
                <th className="px-6 py-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            {/* Table Body */}
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {filteredTeams.length > 0 ? (
                filteredTeams.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400 text-center">
                      {s.id}
                    </td>
                    <td className="px-6 py-4 text-gray-800 dark:text-slate-100 font-semibold">
                      {s.emertimi}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                      {s.trajneri || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                      {s.kontakti || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                      {s.email || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                      {s.qyteti || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                      {s.sporti_emri || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-slate-300 text-center">
                      {formatDate(s.data_themelimit)}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleView(s.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded text-sm font-medium transition duration-200"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(s.id)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded text-sm font-medium transition duration-200"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded text-sm font-medium transition duration-200"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="9"
                    className="px-6 py-4 text-center text-gray-600 dark:text-slate-400"
                  >
                    {hasActiveFilters
                      ? "No teams match these filters."
                      : 'No teams found. Click "Add Team" to add a new one.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination && (
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl px-4 py-4 sm:px-6 flex items-center justify-between shadow-sm mt-4">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="relative inline-flex items-center rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page === pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="relative ml-3 inline-flex items-center rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                Next
              </button>
            </div>

            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Page <span className="font-semibold text-gray-900 dark:text-white">{page}</span> from{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">{pagination.totalPages}</span>
                  {pagination.total && (
                    <>
                      {" "}(Total <span className="font-semibold text-gray-900 dark:text-white">{pagination.total}</span> teams)
                    </>
                  )}
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

        {/* ADD NEW TEAM MODAL */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4 backdrop-blur-sm"
            onClick={handleCloseModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-200 mb-6">
                Add New Team
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Team logo upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Team Logo
                  </label>
                  {formData.logoja && (
                    <img
                      src={resolveTeamLogoUrl(formData.logoja)}
                      alt="Team logo"
                      className="w-16 h-16 object-cover rounded-lg mb-2 border border-gray-200 dark:border-slate-600"
                    />
                  )}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleLogoUpload}
                    className="w-full text-sm text-gray-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 hover:file:bg-green-100 dark:file:bg-green-500/10 dark:file:text-green-400 dark:hover:file:bg-green-500/20"
                  />
                  {uploading && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      Uploading...
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Team Name *
                    </label>
                    <input
                      type="text"
                      name="emertimi"
                      value={formData.emertimi}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200 ${
                        formErrors.emertimi
                          ? "border-red-500"
                          : "border-gray-300 dark:border-slate-600"
                      }`}
                      placeholder="Name of the team"
                      required
                    />
                    {formErrors.emertimi && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.emertimi}
                      </p>
                    )}
                  </div>

                  {/* Trainer input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Trainer *
                    </label>
                    <input
                      type="text"
                      name="trajneri"
                      value={formData.trajneri}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
                      placeholder="Trainer Name"
                      required
                    />
                  </div>

                  {/* Contact input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Contact *
                    </label>
                    <input
                      type="tel"
                      name="kontakti"
                      value={formData.kontakti}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200 ${
                        formErrors.kontakti
                          ? "border-red-500"
                          : "border-gray-300 dark:border-slate-600"
                      }`}
                      placeholder="+383 12 345 678"
                      required
                    />
                    {formErrors.kontakti && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.kontakti}
                      </p>
                    )}
                  </div>

                  {/* Email input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200 ${
                        formErrors.email
                          ? "border-red-500"
                          : "border-gray-300 dark:border-slate-600"
                      }`}
                      placeholder="Email"
                      required
                    />
                    {formErrors.email && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.email}
                      </p>
                    )}
                  </div>

                  {/* City input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      name="qyteti"
                      value={formData.qyteti}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200 ${
                        formErrors.qyteti
                          ? "border-red-500"
                          : "border-gray-300 dark:border-slate-600"
                      }`}
                      placeholder="Enter city name"
                      required
                    />
                    {formErrors.qyteti && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.qyteti}
                      </p>
                    )}
                  </div>

                  {/* Sport input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Sport *
                    </label>
                    <select
                      name="sporti_id"
                      value={formData.sporti_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
                      required
                    >
                      <option value="">Select sport</option>
                      {sports.map((sport) => (
                        <option key={sport.id} value={sport.id}>
                          {sport.emertimi}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Founded Date input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Founded Date *
                    </label>
                    <input
                      type="date"
                      name="data_themelimit"
                      value={formData.data_themelimit}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200 dark:[color-scheme:dark] ${
                        formErrors.data_themelimit
                          ? "border-red-500"
                          : "border-gray-300 dark:border-slate-600"
                      }`}
                      required
                    />
                    {formErrors.data_themelimit && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.data_themelimit}
                      </p>
                    )}
                  </div>
                </div>

                {/* Form buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg transition duration-200"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 bg-gray-400 hover:bg-gray-500 dark:bg-slate-600 dark:hover:bg-slate-500 text-white font-semibold py-2 rounded-lg transition duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* View team modal*/}
        {showViewModal && selectedTeam && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseViewModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-200 mb-6">
                Team Details
              </h3>
              {/* Add this */}
              {selectedTeam.logoja && (
                <div className="flex justify-center mb-6">
                  <img
                    src={resolveTeamLogoUrl(selectedTeam.logoja)}
                    alt={`${selectedTeam.emertimi} logo`}
                    className="w-24 h-24 object-cover rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm"
                  />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Team Name
                  </label>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                    {selectedTeam.emertimi}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Trainer
                  </label>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                    {selectedTeam.trajneri}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Contact
                  </label>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                    {selectedTeam.kontakti}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                    {selectedTeam.email}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    City
                  </label>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                    {selectedTeam.qyteti}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Sport
                  </label>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                    {selectedTeam.sporti_emri || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Founded Date
                  </label>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                    {formatDate(selectedTeam.data_themelimit)}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleCloseViewModal}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit team modal */}
        {showEditModal && selectedTeam && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4 backdrop-blur-sm"
            onClick={handleCloseEditModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-200 mb-6">
                Edit Team
              </h3>

              {/* Team logo upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Team Logo
                </label>
                {formData.logoja && (
                  <img
                    src={resolveTeamLogoUrl(formData.logoja)}
                    alt="Team logo"
                    className="w-16 h-16 object-cover rounded-lg mb-2 border border-gray-200 dark:border-slate-700"
                  />
                )}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLogoUpload}
                  className="w-full text-sm text-gray-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-50 dark:file:bg-green-500/10 file:text-green-700 dark:file:text-green-400 hover:file:bg-green-100 dark:hover:file:bg-green-500/20"
                />
                {uploading && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Uploading...
                  </p>
                )}
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Team name input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Team Name *
                    </label>
                    <input
                      type="text"
                      name="emertimi"
                      value={formData.emertimi}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
                      placeholder="Team Name"
                      required
                    />
                  </div>
                  {/* Trainer input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Trainer *
                    </label>
                    <input
                      type="text"
                      name="trajneri"
                      value={formData.trajneri}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
                      placeholder="Trainer Name"
                      required
                    />
                  </div>
                  {/* Contact input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Contact *
                    </label>
                    <input
                      type="text"
                      name="kontakti"
                      value={formData.kontakti}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
                      placeholder="Contact"
                    />
                  </div>
                  {/* Email input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
                      placeholder="Email"
                    />
                  </div>
                  {/* City input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      name="qyteti"
                      value={formData.qyteti}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
                      placeholder="Enter city name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Sport *
                    </label>
                    <select
                      name="sporti_id"
                      value={formData.sporti_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
                      required
                    >
                      <option value="">Select sport</option>
                      {sports.map((sport) => (
                        <option key={sport.id} value={sport.id}>
                          {sport.emertimi}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Founded date input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Founded Date
                    </label>
                    <input
                      type="date"
                      name="data_themelimit"
                      value={formData.data_themelimit}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200 dark:[color-scheme:dark]"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg transition duration-200"
                  >
                    Update
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="flex-1 bg-gray-400 hover:bg-gray-500 dark:bg-slate-600 dark:hover:bg-slate-500 text-white font-semibold py-2 rounded-lg transition duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete team confirmation modal */}
        {showDeleteModal && selectedTeam && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseDeleteModal}
          >
            <div
              className="w-full max-w-md rounded-lg bg-white dark:bg-slate-800 p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-200 mb-4">
                Delete Team
              </h3>
              <p className="text-gray-600 dark:text-slate-400 mb-6">
                Are you sure you want to delete{" "}
                <strong>{selectedTeam.emertimi}</strong>? This action cannot be
                undone.
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-lg transition duration-200"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
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
