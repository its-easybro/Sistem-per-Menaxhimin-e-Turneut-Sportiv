import { useCallback, useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import * as yup from "yup";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";
import { Calendar, Edit, Eye, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import socket from "../../socket";
import TableSkeleton from "../../components/Skeletons/TableSkeleton"

const matchRefereeSchema = yup.object().shape({
  ndeshja_id: yup.string().required("Match is required"),
  gjyqtari_id: yup.string().required("Referee is required"),
  roli: yup.string().required("Role is required"),
});

const matchRefereeUpdateSchema = yup.object().shape({
  ndeshja_id: yup.string().required("Match is required"),
  gjyqtari_id: yup.string().required("Referee is required"),
  roli: yup.string().required("Role is required"),
});

const initialFormData = {
  ndeshja_id: "",
  gjyqtari_id: "",
  roli: "Kryegjyqtar",
};

const roles = [
  "Kryegjyqtar",
  "Asistent 1",
  "Asistent 2",
  "Gjyqtar i 4-të",
  "VAR",
];

const statusOptions = [
  "Planifikuar",
  "Live",
  "HalfTime",
  "Përfunduar",
  "Shtyrë",
  "Anuluar",
];

function formatDate(value) {
  if (!value) return "N/A";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Invalid date";
    }

    return new Intl.DateTimeFormat("en-GB").format(date);
  } catch {
    return "Invalid date";
  }
}

function getRoleBadgeClasses(role) {
  if (role === "Kryegjyqtar") return "bg-blue-100 text-blue-700";
  if (role === "VAR") return "bg-purple-100 text-purple-700";
  if (role === "Gjyqtar i 4-të") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-700";
}

function getStatusBadgeClasses(status) {
  if (status === "Përfunduar") return "bg-green-100 text-green-700";
  if (status === "Live") return "bg-red-100 text-red-700";
  if (status === "Shtyrë") return "bg-yellow-100 text-yellow-700";
  if (status === "Anuluar") return "bg-gray-200 text-gray-700";
  return "bg-blue-100 text-blue-700";
}

function MatchRefereeFormFields({
  formData,
  matches,
  referees,
  getMatchLabel,
  onChange,
  formErrors,
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Match</span>
        <select
          name="ndeshja_id"
          value={formData.ndeshja_id}
          onChange={onChange}
          className={`rounded-lg border ${formErrors?.ndeshja_id ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} dark:bg-slate-700 dark:text-slate-200 px-3 py-2 outline-none focus:border-blue-500`}
          required
        >
          <option value="">Select match</option>
          {matches.map((match) => (
            <option key={match.id} value={match.id}>
              {getMatchLabel(match.id)} - {formatDate(match.data_ndeshjes)}
            </option>
          ))}
        </select>
        {formErrors?.ndeshja_id && <p className="text-sm text-red-500 mt-1">{formErrors.ndeshja_id}</p>}
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Referee</span>
        <select
          name="gjyqtari_id"
          value={formData.gjyqtari_id}
          onChange={onChange}
          className={`rounded-lg border ${formErrors?.gjyqtari_id ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} dark:bg-slate-700 dark:text-slate-200 px-3 py-2 outline-none focus:border-blue-500`}
          required
        >
          <option value="">Select referee</option>
          {referees.map((referee) => (
            <option key={referee.id} value={referee.id}>
              {referee.emri} {referee.mbiemri} ({referee.kategoria || "N/A"})
            </option>
          ))}
        </select>
        {formErrors?.gjyqtari_id && <p className="text-sm text-red-500 mt-1">{formErrors.gjyqtari_id}</p>}
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Role</span>
        <select
          name="roli"
          value={formData.roli}
          onChange={onChange}
          className={`rounded-lg border ${formErrors?.roli ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} dark:bg-slate-700 dark:text-slate-200 px-3 py-2 outline-none focus:border-blue-500`}
          required
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        {formErrors?.roli && <p className="text-sm text-red-500 mt-1">{formErrors.roli}</p>}
      </label>
    </div>
  );
}

export default function MatchReferees() {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.is_admin;
  const isReferee = user?.is_referee;
  const canAccessPage = isAdmin || isReferee;

  const [assignments, setAssignments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [referees, setReferees] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({
    statusi: "",
    date_from: "",
    date_to: "",
  });
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [alert, setAlert] = useState(null);
  const [scoreForm, setScoreForm] = useState({
    golat_shtepiak: 0,
    golat_mysafir: 0,
  });
  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});

  const loadData = useCallback(async (filtersObj) => {
    if (!canAccessPage) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        ...(filtersObj.statusi && { statusi: filtersObj.statusi }),
        ...(filtersObj.date_from && { date_from: filtersObj.date_from }),
        ...(filtersObj.date_to && { date_to: filtersObj.date_to }),
      });
      const assignmentsUrl = params.toString()
        ? `/match-referees?${params}`
        : "/match-referees";

      const [
        assignmentsResponse,
        matchesResponse,
        refereesResponse,
        teamsResponse,
      ] =
        await Promise.all([
          api.get(assignmentsUrl),
          api.get("/matches"),
          api.get("/referees"),
          api.get("/teams"),
        ]);

      setAssignments(
        Array.isArray(assignmentsResponse.data) ? assignmentsResponse.data : [],
      );
      setMatches(Array.isArray(matchesResponse.data) ? matchesResponse.data : []);
      setReferees(
        Array.isArray(refereesResponse.data) ? refereesResponse.data : [],
      );
      setTeams(Array.isArray(teamsResponse.data) ? teamsResponse.data : []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [canAccessPage]);

  useEffect(() => {
    loadData(filters);
  }, [filters, loadData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleScoreUpdate = ({ matchId, homeScore, awayScore }) => {
      setMatches((prev) =>
        prev.map((match) =>
          String(match.id) === String(matchId)
            ? {
                ...match,
                score: {
                  golat_shtepiak: homeScore,
                  golat_mysafir: awayScore,
                },
              }
            : match,
        ),
      );

      if (String(selectedAssignment?.ndeshja_id) === String(matchId)) {
        setScoreForm({
          golat_shtepiak: homeScore,
          golat_mysafir: awayScore,
        });
      }
    };

    socket.on("score_update", handleScoreUpdate);

    return () => {
      socket.off("score_update", handleScoreUpdate);
    };
  }, [selectedAssignment]);

  const resetForm = () => {
    setFormData(initialFormData);
    setFormErrors({});
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClearFilters = () => {
    setFilters({ statusi: "", date_from: "", date_to: "" });
    setSearchQuery("");
    setDebouncedSearch("");
  };

  const getMatchById = (matchId) =>
    matches.find((item) => String(item.id) === String(matchId));

  const getRefereeById = (refereeId) =>
    referees.find((item) => String(item.id) === String(refereeId));

  const getTeamName = (teamId) => {
    const team = teams.find((item) => String(item.id) === String(teamId));
    return team?.emertimi || `Team #${teamId}`;
  };

  const getMatchLabel = (matchId) => {
    const match = getMatchById(matchId);

    if (!match) {
      return `Match #${matchId}`;
    }

    return `${getTeamName(match.ekipi_shtepiak_id)} vs ${getTeamName(match.ekipi_mysafir_id)}`;
  };

  const getRefereeLabel = (refereeId) => {
    const referee = getRefereeById(refereeId);
    return referee ? `${referee.emri} ${referee.mbiemri}` : "N/A";
  };

  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleView = async (id) => {
    const assignment = assignments.find((item) => item.id === id);
    if (!assignment) return;

    setSelectedAssignment(assignment);
    setScoreForm({
      golat_shtepiak: 0,
      golat_mysafir: 0,
    });
    setShowViewModal(true);

    try {
      const response = await api.get("/match-results");
      const results = Array.isArray(response.data) ? response.data : [];
      const existingResult = results.find(
        (result) => String(result.ndeshja_id) === String(assignment.ndeshja_id),
      );

      if (existingResult) {
        setScoreForm({
          golat_shtepiak: existingResult.golat_shtepiak ?? 0,
          golat_mysafir: existingResult.golat_mysafir ?? 0,
        });
      }
    } catch (err) {
      setAlert({
        type: "error",
        message:
          "Error loading match score: " +
          (err?.response?.data?.error || err.message),
      });
    }
  };

  const handleEdit = (id) => {
    const assignment = assignments.find((item) => item.id === id);
    if (!assignment) return;

    setSelectedAssignment(assignment);
    setFormData({
      ndeshja_id: String(assignment.ndeshja_id),
      gjyqtari_id: String(assignment.gjyqtari_id),
      roli: assignment.roli || "Kryegjyqtar",
    });
    setShowEditModal(true);
  };

  const handleDelete = (id) => {
    const assignment = assignments.find((item) => item.id === id);
    if (!assignment) return;

    setSelectedAssignment(assignment);
    setShowDeleteModal(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setShowModal(false);
  };

  const handleCloseViewModal = () => {
    setSelectedAssignment(null);
    setShowViewModal(false);
  };

  const handleCloseEditModal = () => {
    resetForm();
    setSelectedAssignment(null);
    setShowEditModal(false);
  };

  const handleCloseDeleteModal = () => {
    setSelectedAssignment(null);
    setShowDeleteModal(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleScoreInputChange = (e) => {
    const { name, value } = e.target;

    setScoreForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleScoreSubmit = async (e) => {
    e.preventDefault();

    if (!selectedAssignment) return;

    try {
      const response = await api.patch(
        `/matches/${selectedAssignment.ndeshja_id}/score`,
        {
          golat_shtepiak: Number(scoreForm.golat_shtepiak),
          golat_mysafir: Number(scoreForm.golat_mysafir),
        },
      );

      const result = response.data.result;
      const nextScore = {
        golat_shtepiak: result.golat_shtepiak ?? 0,
        golat_mysafir: result.golat_mysafir ?? 0,
      };

      setScoreForm(nextScore);
      setMatches((prev) =>
        prev.map((match) =>
          String(match.id) === String(selectedAssignment.ndeshja_id)
            ? { ...match, score: nextScore }
            : match,
        ),
      );

      setAlert({ type: "success", message: "Score updated successfully!" });
    } catch (err) {
      setAlert({
        type: "error",
        message:
          "Error updating score: " +
          (err?.response?.data?.error || err.message),
      });
    }
  };

  const buildPayload = () => ({
    ndeshja_id: Number(formData.ndeshja_id),
    gjyqtari_id: Number(formData.gjyqtari_id),
    roli: formData.roli,
  });

  const validateForm = () => {
    if (!formData.ndeshja_id || !formData.gjyqtari_id || !formData.roli) {
      return "Please fill in all required fields.";
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await matchRefereeSchema.validate(formData, { abortEarly: false });

      await api.post("/match-referees", buildPayload());

      await loadData(filters);
      handleCloseModal();
      setFormErrors({});
      setAlert({ type: "success", message: "Assignment created successfully!" });
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
            "Error creating assignment: " +
            (err?.response?.data?.error || err.message),
        });
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!selectedAssignment) return;

    try {
      await matchRefereeUpdateSchema.validate(formData, { abortEarly: false });

      await api.put(
        `/match-referees/${selectedAssignment.id}`,
        buildPayload(),
      );

      await loadData(filters);

      handleCloseEditModal();
      setAlert({ type: "success", message: "Assignment updated successfully!" });
    } catch (err) {
      setAlert({
        type: "error",
        message:
          "Error updating assignment: " +
          (err?.response?.data?.error || err.message),
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAssignment) return;

    try {
      await api.delete(`/match-referees/${selectedAssignment.id}`);

      await loadData(filters);

      handleCloseDeleteModal();
      setAlert({ type: "success", message: "Assignment deleted successfully!" });
    } catch (err) {
      setAlert({
        type: "error",
        message:
          "Error deleting assignment: " +
          (err?.response?.data?.error || err.message),
      });
    }
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    filters.statusi !== "" ||
    filters.date_from !== "" ||
    filters.date_to !== "";

  const filteredAssignments = assignments.filter((item) => {
    const query = debouncedSearch.toLowerCase();
    if (!query) {
      return true;
    }

    const match = getMatchById(item.ndeshja_id);
    const referee = getRefereeById(item.gjyqtari_id);

    return (
      String(item.id).includes(query) ||
      item.roli?.toLowerCase().includes(query) ||
      getMatchLabel(item.ndeshja_id).toLowerCase().includes(query) ||
      referee?.emri?.toLowerCase().includes(query) ||
      referee?.mbiemri?.toLowerCase().includes(query) ||
      referee?.kategoria?.toLowerCase().includes(query) ||
      match?.statusi?.toLowerCase().includes(query) ||
      formatDate(match?.data_ndeshjes).toLowerCase().includes(query)
    );
  });

  if (!user || !canAccessPage) {
    return <Navigate to="/login" replace />;
  }

  if (loading && !hasLoaded) {
    return (
      <div className="delay-skeleton">
        <TableSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-gray-50 px-4">
        <div className="rounded-xl bg-white px-6 py-4 text-sm font-medium text-red-600 shadow-sm">
          Error loading match assignments: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent p-4">
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="mx-auto w-full space-y-6">
        <div className="mb-8">
          <h2 className="mb-5 text-2xl font-bold text-gray-800 dark:text-slate-200">
            {isAdmin ? "Match Referee Assignments" : "My Matches"}
          </h2>

          <div className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col justify-between gap-4 sm:flex-row">
              <div className="relative max-w-2xl flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search size={18} className="text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    isAdmin
                      ? "Search by match, referee, role, date, or status"
                      : "Search by match, role, date, or status"
                  }
                  className="w-full rounded-lg border border-gray-200 bg-gray-50/50 py-2 pl-10 pr-4 text-sm text-gray-900 transition-all placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-600"
                />
              </div>

              {isAdmin && (
                <button
                  onClick={handleCreate}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow active:scale-[0.98]"
                >
                  <Plus size={18} />
                  Assign Referee
                </button>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3 dark:border-slate-800/60">
              <div className="relative min-w-[160px] flex-1 sm:flex-none">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                  <SlidersHorizontal size={14} />
                </div>
                <select
                  name="statusi"
                  value={filters.statusi}
                  onChange={handleFilterChange}
                  className="w-full cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-8 text-sm font-medium text-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                >
                  <option value="">All statuses</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative min-w-[160px] flex-1 sm:flex-none">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                  <Calendar size={14} />
                </div>
                <input
                  type="date"
                  name="date_from"
                  value={filters.date_from}
                  max={filters.date_to || undefined}
                  onChange={handleFilterChange}
                  aria-label="From date"
                  title="From date"
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm font-medium text-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                />
              </div>

              <div className="relative min-w-[160px] flex-1 sm:flex-none">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                  <Calendar size={14} />
                </div>
                <input
                  type="date"
                  name="date_to"
                  value={filters.date_to}
                  min={filters.date_from || undefined}
                  onChange={handleFilterChange}
                  aria-label="To date"
                  title="To date"
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm font-medium text-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="ml-auto flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-gray-500 transition-all duration-200 hover:bg-gray-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-red-400"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className={`flex overflow-x-auto rounded-lg bg-white shadow-md dark:bg-slate-800 ${loading ? "pointer-events-none opacity-60" : ""}`}>
          {filteredAssignments.length === 0 ? (
            <div className="w-full px-6 py-12 text-center text-gray-600 dark:text-slate-400">
              {hasActiveFilters
                ? debouncedSearch
                  ? `No assignments match "${debouncedSearch}". Try a different search.`
                  : "No assignments match the selected filters."
                : isAdmin
                  ? 'No assignments found. Click "Assign Referee" to add a new one.'
                  : "No matches assigned to you yet."}
            </div>
          ) : (
            <table className="w-full border-collapse text-left min-w-[800px]">
              <thead className="bg-gray-800 dark:bg-slate-700 text-white">
                <tr>
                  <th className="px-4 py-3 text-center font-semibold">ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Match</th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-left font-semibold">Referee</th>
                  )}
                  <th className="px-4 py-3 text-left font-semibold">Role</th>
                  <th className="px-4 py-3 text-center font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Category</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredAssignments.map((assignment) => {
                  const match = getMatchById(assignment.ndeshja_id);
                  const referee = getRefereeById(assignment.gjyqtari_id);

                  return (
                    <tr
                      key={assignment.id}
                      className="transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-slate-700/50"
                    >
                      <td className="px-4 py-3 text-center text-gray-500 dark:text-slate-400">
                        {assignment.id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 dark:text-slate-200">
                          {getMatchLabel(assignment.ndeshja_id)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-slate-400">
                          {match?.ora_fillimit || "No start time"}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                          {getRefereeLabel(assignment.gjyqtari_id)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getRoleBadgeClasses(assignment.roli)}`}
                        >
                          {assignment.roli || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-700 dark:text-slate-300">
                        {formatDate(match?.data_ndeshjes)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClasses(match?.statusi)}`}
                        >
                          {match?.statusi || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                        {referee?.kategoria || "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleView(assignment.id)}
                            className="rounded bg-blue-500 p-2 text-sm font-medium text-white transition duration-200 hover:bg-blue-600"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleEdit(assignment.id)}
                              className="rounded bg-yellow-500 p-2 text-sm font-medium text-white transition duration-200 hover:bg-yellow-600"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(assignment.id)}
                              className="rounded bg-red-500 p-2 text-sm font-medium text-white transition duration-200 hover:bg-red-600"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isAdmin && showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white dark:bg-slate-800 p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-6 text-2xl font-bold text-gray-800 dark:text-slate-200">
              Assign Referee to Match
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <MatchRefereeFormFields
                formData={formData}
                matches={matches}
                referees={referees}
                getMatchLabel={getMatchLabel}
                onChange={handleInputChange}
                formErrors={formErrors}
              />
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-green-500 py-2 font-semibold text-white transition duration-200 hover:bg-green-600"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 rounded-lg bg-gray-400 py-2 font-semibold text-white transition duration-200 hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && selectedAssignment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseViewModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white dark:bg-slate-800 p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-6 text-2xl font-bold text-gray-800 dark:text-slate-200">
              Match Assignment Details
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Match
                </label>
                <p className="rounded-lg bg-gray-100 dark:bg-slate-700 px-4 py-2 text-gray-800 dark:text-slate-200">
                  {getMatchLabel(selectedAssignment.ndeshja_id)}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Referee
                </label>
                <p className="rounded-lg bg-gray-100 dark:bg-slate-700 px-4 py-2 text-gray-800 dark:text-slate-200">
                  {getRefereeLabel(selectedAssignment.gjyqtari_id)}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Role
                </label>
                <p className="rounded-lg bg-gray-100 dark:bg-slate-700 px-4 py-2 text-gray-800 dark:text-slate-200">
                  {selectedAssignment.roli || "N/A"}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Date
                </label>
                <p className="rounded-lg bg-gray-100 dark:bg-slate-700 px-4 py-2 text-gray-800 dark:text-slate-200">
                  {formatDate(getMatchById(selectedAssignment.ndeshja_id)?.data_ndeshjes)}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Start Time
                </label>
                <p className="rounded-lg bg-gray-100 dark:bg-slate-700 px-4 py-2 text-gray-800 dark:text-slate-200">
                  {getMatchById(selectedAssignment.ndeshja_id)?.ora_fillimit || "N/A"}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Status
                </label>
                <p className="rounded-lg bg-gray-100 dark:bg-slate-700 px-4 py-2 text-gray-800 dark:text-slate-200">
                  {getMatchById(selectedAssignment.ndeshja_id)?.statusi || "N/A"}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Referee Category
                </label>
                <p className="rounded-lg bg-gray-100 dark:bg-slate-700 px-4 py-2 text-gray-800 dark:text-slate-200">
                  {getRefereeById(selectedAssignment.gjyqtari_id)?.kategoria || "N/A"}
                </p>
              </div>
            </div>
            <form
              onSubmit={handleScoreSubmit}
              className="mt-6 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 p-4"
            >
              <h4 className="mb-4 text-lg font-semibold text-gray-800 dark:text-slate-200">
                Update Live Score
              </h4>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Home Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="golat_shtepiak"
                    value={scoreForm.golat_shtepiak}
                    onChange={handleScoreInputChange}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Away Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="golat_mysafir"
                    value={scoreForm.golat_mysafir}
                    onChange={handleScoreInputChange}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
              >
                Update Score
              </button>
            </form>
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={handleCloseViewModal}
                className="flex-1 rounded-lg bg-gray-400 py-2 font-semibold text-white transition duration-200 hover:bg-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && showEditModal && selectedAssignment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseEditModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white dark:bg-slate-800 p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-6 text-2xl font-bold text-gray-800 dark:text-slate-200">
              Edit Assignment
            </h3>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <MatchRefereeFormFields
                formData={formData}
                matches={matches}
                referees={referees}
                getMatchLabel={getMatchLabel}
                onChange={handleInputChange}
                formErrors={formErrors}
              />
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-yellow-500 py-2 font-semibold text-white transition duration-200 hover:bg-yellow-600"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="flex-1 rounded-lg bg-gray-400 py-2 font-semibold text-white transition duration-200 hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdmin && showDeleteModal && selectedAssignment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseDeleteModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white dark:bg-slate-800 p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-6 text-2xl font-bold text-gray-800 dark:text-slate-200">
              Delete Assignment
            </h3>
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-slate-300">
                Are you sure you want to delete the referee assignment for{" "}
                <span className="font-semibold text-gray-900 dark:text-slate-200">
                  {getMatchLabel(selectedAssignment.ndeshja_id)}
                </span>
                ?
              </p>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="flex-1 rounded-lg bg-red-600 py-2 font-semibold text-white transition duration-200 hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  className="flex-1 rounded-lg bg-gray-400 py-2 font-semibold text-white transition duration-200 hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
