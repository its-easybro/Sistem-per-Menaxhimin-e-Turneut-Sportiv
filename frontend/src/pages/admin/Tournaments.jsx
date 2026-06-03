import { useContext, useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import * as yup from "yup";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";
import { Trash2, Edit, Eye, EyeOff, Search, ChevronLeft, ChevronRight, Plus, SlidersHorizontal } from "lucide-react";
import TableSkeleton from "../../components/Skeletons/TableSkeleton"

const initialFormData = {
  emertimi: "",
  sporti_id: "",
  lloji: "",
  data_fillimit: "",
  data_perfundimit: "",
  lokacioni: "",
  organizatori_id: "",
  cmimi_regjistrimit: "0.00",
  statusi: "Regjistrimi",
  pershkrimi: "",
};

const tournamentTypeOptions = [
  "Grup + Eliminim",
  "Vetëm Grup",
  "Vetëm Eliminim",
  "Liga",
];

const statusOptions = [
  "Regjistrimi",
  "Aktiv",
  "Përfunduar",
  "Anuluar",
];

const tournamentCreateSchema = yup.object().shape({
  emertimi: yup
    .string()
    .min(2, "Tournament name must be at least 2 characters")
    .required("Tournament name is required"),
  sporti_id: yup.number().required("Sport is required"),
  lloji: yup
    .string()
    .oneOf(tournamentTypeOptions, "Invalid tournament format")
    .required("Tournament format is required"),
  statusi: yup
    .string()
    .oneOf(statusOptions, "Invalid status")
    .required("Status is required"),
  data_fillimit: yup.date().required("Start date is required"),
  data_perfundimit: yup.date().required("End date is required"),
  lokacioni: yup.string().min(2, "Location must be at least 2 characters"),
  organizatori_id: yup.number().nullable(),
  cmimi_regjistrimit: yup
    .number()
    .min(0, "Registration price cannot be negative")
    .nullable(),
  pershkrimi: yup.string(),
});

const tournamentUpdateSchema = yup.object().shape({
  emertimi: yup
    .string()
    .min(2, "Tournament name must be at least 2 characters"),
  sporti_id: yup.number(),
  lloji: yup
    .string()
    .oneOf(tournamentTypeOptions, "Invalid tournament format"),
  statusi: yup.string().oneOf(statusOptions, "Invalid status"),
  data_fillimit: yup.date(),
  data_perfundimit: yup.date(),
  lokacioni: yup.string(),
  organizatori_id: yup.number().nullable(),
  cmimi_regjistrimit: yup
    .number()
    .min(0, "Registration price cannot be negative")
    .nullable(),
  pershkrimi: yup.string(),
});

function normalizeTournamentForm(formData) {
  // Trims text fields to keep saved tournament data consistent.
  return {
    ...formData,
    emertimi: formData.emertimi.trim(),
    lokacioni: formData.lokacioni.trim(),
    pershkrimi: formData.pershkrimi.trim(),
  };
}

function getStatusBadgeClasses(status) {
  // Maps tournament status values to badge color classes.
  if (status === "Aktiv") return "bg-green-100 text-green-700";
  if (status === "Regjistrimi") return "bg-blue-100 text-blue-700";
  if (status === "Përfunduar") return "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-100";
  if (status === "Anuluar") return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100";
  return "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-100";
}

function getFormatBadgeClasses(format) {
  // Maps tournament format values to badge color classes.
  if (format === "Liga") return "bg-purple-100 text-purple-700";
  if (format === "Grup + Eliminim") return "bg-amber-100 text-amber-700";
  if (format === "Vetëm Grup") return "bg-sky-100 text-sky-700";
  if (format === "Vetëm Eliminim") return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-100";
  return "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-100";
}

function toDateInputValue(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

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

function formatCurrency(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}
function normalizeUserRecord(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username ?? user.emri ?? "",
    full_name: user.full_name ?? ([user.emri, user.mbiemri].filter(Boolean).join(" ") || ""),
    roli: user.roli ?? "user",
    is_admin: user.is_admin ?? user.roli === "admin",
    is_organizer: user.is_organizer ?? user.roli === "organizator",
    is_referee: user.is_referee ?? user.roli === "gjyqtar",
  };
}

function getOrganizerName(users, organizerId) {
  const organizer = users.find((item) => item.id === organizerId);
  return organizer?.full_name || organizer?.username || "N/A";
}

function isOrganizerUser(user) {
  return user?.is_organizer || user?.roli === "organizator";
}

function isAssignableOrganizerUser(user) {
  return isOrganizerUser(user) || user?.roli === "user";
}

function TournamentFormFields({ formData, sports, users, onChange, canAssignOrganizer, formErrors = {} }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Tournament Name</span>
        <input
          type="text"
          name="emertimi"
          value={formData.emertimi}
          onChange={onChange}
          className={`rounded-lg border px-3 py-2 bg-white text-gray-900 outline-none focus:border-blue-500 dark:bg-slate-700 dark:text-slate-200 ${
            formErrors.emertimi ? "border-red-500" : "border-gray-300 dark:border-slate-700"
          }`}
          required
        />
        {formErrors.emertimi && (
          <p className="text-red-500 text-sm mt-1">{formErrors.emertimi}</p>
        )}
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Sport</span>
        <select
          name="sporti_id"
          value={formData.sporti_id}
          onChange={onChange}
          className={`rounded-lg border px-3 py-2 bg-white text-gray-900 outline-none focus:border-blue-500 dark:bg-slate-700 dark:text-slate-200 ${
            formErrors.sporti_id ? "border-red-500" : "border-gray-300 dark:border-slate-700"
          }`}
          required
        >
          <option value="">Select sport</option>
          {sports.map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.emertimi}
            </option>
          ))}
        </select>
        {formErrors.sporti_id && (
          <p className="text-red-500 text-sm mt-1">{formErrors.sporti_id}</p>
        )}
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Format</span>
        <select
          name="lloji"
          value={formData.lloji}
          onChange={onChange}
          className={`rounded-lg border px-3 py-2 bg-white text-gray-900 outline-none focus:border-blue-500 dark:bg-slate-700 dark:text-slate-200 ${
            formErrors.lloji ? "border-red-500" : "border-gray-300 dark:border-slate-700"
          }`}
          required
        >
          <option value="">Select format</option>
          {tournamentTypeOptions.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {formErrors.lloji && (
          <p className="text-red-500 text-sm mt-1">{formErrors.lloji}</p>
        )}
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Status</span>
        <select
          name="statusi"
          value={formData.statusi}
          onChange={onChange}
          className={`rounded-lg border px-3 py-2 bg-white text-gray-900 outline-none focus:border-blue-500 dark:bg-slate-700 dark:text-slate-200 ${
            formErrors.statusi ? "border-red-500" : "border-gray-300 dark:border-slate-700"
          }`}
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        {formErrors.statusi && (
          <p className="text-red-500 text-sm mt-1">{formErrors.statusi}</p>
        )}
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Start Date</span>
        <input
          type="date"
          name="data_fillimit"
          value={formData.data_fillimit}
          onChange={onChange}
          className={`rounded-lg border px-3 py-2 bg-white text-gray-900 outline-none focus:border-blue-500 dark:bg-slate-700 dark:text-slate-200 ${
            formErrors.data_fillimit ? "border-red-500" : "border-gray-300 dark:border-slate-700"
          }`}
          required
        />
        {formErrors.data_fillimit && (
          <p className="text-red-500 text-sm mt-1">{formErrors.data_fillimit}</p>
        )}
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-slate-200">End Date</span>
        <input
          type="date"
          name="data_perfundimit"
          value={formData.data_perfundimit}
          onChange={onChange}
          className={`rounded-lg border px-3 py-2 bg-white text-gray-900 outline-none focus:border-blue-500 dark:bg-slate-700 dark:text-slate-200 ${
            formErrors.data_perfundimit ? "border-red-500" : "border-gray-300 dark:border-slate-700"
          }`}
          required
        />
        {formErrors.data_perfundimit && (
          <p className="text-red-500 text-sm mt-1">{formErrors.data_perfundimit}</p>
        )}
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Location</span>
        <input
          type="text"
          name="lokacioni"
          value={formData.lokacioni}
          onChange={onChange}
          className={`rounded-lg border px-3 py-2 bg-white text-gray-900 outline-none focus:border-blue-500 dark:bg-slate-700 dark:text-slate-200 ${
            formErrors.lokacioni ? "border-red-500" : "border-gray-300 dark:border-slate-700"
          }`}
        />
        {formErrors.lokacioni && (
          <p className="text-red-500 text-sm mt-1">{formErrors.lokacioni}</p>
        )}
      </label>

      {canAssignOrganizer && (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Assign Organizer</span>
          <select
            name="organizatori_id"
            value={formData.organizatori_id}
            onChange={onChange}
            className="rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 outline-none focus:border-blue-500 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-700"
          >
            <option value="">No organizer</option>
            {users.map((organizer) => (
              <option key={organizer.id} value={organizer.id}>
                {organizer.full_name || organizer.username} ({organizer.email})
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Registration Price</span>
        <input
          type="number"
          min="0"
          step="0.01"
          name="cmimi_regjistrimit"
          value={formData.cmimi_regjistrimit}
          onChange={onChange}
          className={`rounded-lg border px-3 py-2 bg-white text-gray-900 outline-none focus:border-blue-500 dark:bg-slate-700 dark:text-slate-200 ${
            formErrors.cmimi_regjistrimit ? "border-red-500" : "border-gray-300 dark:border-slate-700"
          }`}
        />
        {formErrors.cmimi_regjistrimit && (
          <p className="text-red-500 text-sm mt-1">{formErrors.cmimi_regjistrimit}</p>
        )}
      </label>

      <label className="flex flex-col gap-2 md:col-span-2">
        <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Description</span>
        <textarea
          name="pershkrimi"
          value={formData.pershkrimi}
          onChange={onChange}
          rows={4}
          className="rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 outline-none focus:border-blue-500 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-700"
        />
      </label>
    </div>
  );
}

export default function Tournaments() {
  // Admin page for tournament CRUD with supporting sport lookups.
  const { user } = useContext(AuthContext);
  // Reuses the same page for admins and organizers.
  // The organizer only receives their own tournaments from the backend.
  const canManageTournaments = user?.is_admin || user?.is_organizer;
  const isAdmin = user?.is_admin;
  // Stores tournament/sport datasets plus modal, selection, and form UI state.
  const [tournaments, setTournaments] = useState([]);
  const [sports, setSports] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [alert, setAlert] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    lloji: "",
    statusi: "",
    sporti_id: "",
    organizatori_id: "",
  });
  const organizerUsers = users.filter(isOrganizerUser);
  const assignableUsers = users.filter(isAssignableOrganizerUser);

  const loadTournaments = useCallback(async (pageNum, filtersObj) => {
    if (!canManageTournaments) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: pageNum,
        limit: 5,
        ...(filtersObj.search && { search: filtersObj.search }),
        ...(filtersObj.lloji && { lloji: filtersObj.lloji }),
        ...(filtersObj.statusi && { statusi: filtersObj.statusi }),
        ...(filtersObj.sporti_id && { sporti_id: filtersObj.sporti_id }),
        ...(filtersObj.organizatori_id && { organizatori_id: filtersObj.organizatori_id }),
      });

      const requests = [api.get(`/tournaments?${params}`), api.get(`/sports`)];
      if (isAdmin) {
        requests.push(api.get(`/users?limit=all`));
      }

      const [tournamentsRes, sportsRes, usersRes] = await Promise.all(requests);

      const tournamentPayload = tournamentsRes.data;
      const tournamentsData = Array.isArray(tournamentPayload)
        ? tournamentPayload
        : tournamentPayload?.data ?? [];
      const paginationData = Array.isArray(tournamentPayload)
        ? null
        : tournamentPayload?.pagination ?? null;

      setTournaments(Array.isArray(tournamentsData) ? tournamentsData : []);
      setPagination(paginationData);
      setSports(Array.isArray(sportsRes.data) ? sportsRes.data : []);
      const usersPayload = usersRes?.data?.data ?? usersRes?.data ?? [];
      setUsers(Array.isArray(usersPayload) ? usersPayload.map(normalizeUserRecord) : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [canManageTournaments, isAdmin]);

  const handleClearFilters = () => {
    const resetFilters = { search: "", lloji: "", statusi: "", sporti_id: "", organizatori_id: "" };
    setFilters(resetFilters);
    setSearchQuery("");
  };

  const hasActiveFilters = filters.search !== "" || filters.lloji !== "" || filters.statusi !== "" || filters.sporti_id !== "" || filters.organizatori_id !== "";

  useEffect(() => {
    loadTournaments(page, filters);
  }, [loadTournaments, page, filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => (prev.search === searchQuery ? prev : { ...prev, search: searchQuery }))
      if (searchQuery !== filters.search) {
        setPage(1);
      }
    }, 400);
    
    return () => clearTimeout(timer);
  }, [searchQuery, filters.search])

  const resetForm = () => {
    setFormData(initialFormData);
    setFormErrors({});
  };

  const getSportName = (sportId) => {
    const sport = sports.find((item) => item.id === sportId);
    return sport?.emertimi || "Unknown";
  };

  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleView = (id) => {
    const tournament = tournaments.find((item) => item.id === id);
    if (!tournament) return;

    setSelectedTournament(tournament);
    setShowViewModal(true);
  };

  const handleEdit = (id) => {
    const tournament = tournaments.find((item) => item.id === id);
    if (!tournament) return;

    setSelectedTournament(tournament);
    setFormData({
      emertimi: tournament.emertimi || "",
      sporti_id: tournament.sporti_id ?? "",
      lloji: tournament.lloji || "",
      data_fillimit: toDateInputValue(tournament.data_fillimit),
      data_perfundimit: toDateInputValue(tournament.data_perfundimit),
      lokacioni: tournament.lokacioni || "",
      organizatori_id: tournament.organizatori_id ? String(tournament.organizatori_id) : "",
      cmimi_regjistrimit: String(tournament.cmimi_regjistrimit ?? "0.00"),
      statusi: tournament.statusi || "Regjistrimi",
      pershkrimi: tournament.pershkrimi || "",
    });
    setShowEditModal(true);
  };

  const handleDelete = (id) => {
    const tournament = tournaments.find((item) => item.id === id);
    if (!tournament) return;

    setSelectedTournament(tournament);
    setShowDeleteModal(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setShowModal(false);
  };

  const handleCloseViewModal = () => {
    setSelectedTournament(null);
    setShowViewModal(false);
  };

  const handleCloseEditModal = () => {
    resetForm();
    setSelectedTournament(null);
    setShowEditModal(false);
  };

  const handleCloseDeleteModal = () => {
    setSelectedTournament(null);
    setShowDeleteModal(false);
  };

  const buildPayload = () => ({
    ...normalizeTournamentForm(formData),
    sporti_id: Number(formData.sporti_id),
    organizatori_id:
      formData.organizatori_id === ""
        ? null
        : Number(formData.organizatori_id),
    cmimi_regjistrimit:
      formData.cmimi_regjistrimit === ""
        ? 0
        : Number(formData.cmimi_regjistrimit),
  });

  const validateOrganizerAssignment = () => {
    if (!formData.organizatori_id) {
      return null;
    }

    const organizerId = Number(formData.organizatori_id);
    const organizer = assignableUsers.find((item) => item.id === organizerId);

    if (!organizer) {
      return "Only users with role user or organizer can be assigned to a tournament.";
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await tournamentCreateSchema.validate(formData, { abortEarly: false });

      const organizerValidationError = validateOrganizerAssignment();
      if (organizerValidationError) {
        setAlert({ type: "error", message: organizerValidationError });
        return;
      }

      const response = await api.post(`/tournaments`, buildPayload());
      const data = response.data || {};

      setTournaments((prev) => [...prev, data]);
      handleCloseModal();
      setAlert({ type: 'success', message: 'Tournament created successfully!' });
    } catch (err) {
      if (err.inner) {
        const validationErrors = {};
        err.inner.forEach((error) => {
          validationErrors[error.path] = error.message;
        });
        setFormErrors(validationErrors);
      } else {
        const message = err.response?.data?.error || err.message;
        setAlert({ type: 'error', message: 'Error creating tournament: ' + message });
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!selectedTournament) return;

    try {
      await tournamentUpdateSchema.validate(formData, { abortEarly: false });

      const organizerValidationError = validateOrganizerAssignment();
      if (organizerValidationError) {
        setAlert({ type: "error", message: organizerValidationError });
        return;
      }

      const response = await api.put(`/tournaments/${selectedTournament.id}`,  buildPayload());
      const data = response.data || {};

      setTournaments((prev) =>
        prev.map((item) => (item.id === data.id ? data : item)),
      );

      handleCloseEditModal();
      setAlert({ type: 'success', message: 'Tournament updated successfully!' });
    } catch (err) {
      if (err.inner) {
        const validationErrors = {};
        err.inner.forEach((error) => {
          validationErrors[error.path] = error.message;
        });
        setFormErrors(validationErrors);
      } else {
        const message = err.response?.data?.error || err.message;
        setAlert({ type: 'error', message: 'Error updating tournament: ' + message });
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTournament) return;

    try {
      await api.delete(`/tournaments/${selectedTournament.id}`);

      setTournaments((prev) =>
        prev.filter((item) => item.id !== selectedTournament.id),
      );

      handleCloseDeleteModal();
      setAlert({ type: 'success', message: 'Tournament deleted successfully!' });
    } catch (err) {
      const message = err.response?.data?.error || err.message;
      setAlert({ type: 'error', message: 'Error deleting tournament: ' + message });
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

  const tournamentList = Array.isArray(tournaments) ? tournaments : [];
  const filteredTournaments = tournamentList.filter((item) => {
    if (!debouncedSearch) {
      return true;
    }

    const query = debouncedSearch.toLowerCase();
    return [
      item.emertimi,
      getSportName(item.sporti_id),
      item.lloji,
      item.statusi,
      item.lokacioni,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  // Organizers can open this page too, but only for their assigned tournament data.
  if (!user || !canManageTournaments) {
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
          Error loading tournaments: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-slate-900 p-4">
      {alert && (
        <Alert 
          type={alert.type} 
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      <div className="w-full mx-auto space-y-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-5">Tournament Management</h2>
          
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative flex-1 max-w-2xl">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400 dark:text-gray-500" />
              </div>
            <input
              type="text"
              name="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Sport, Format, Location, or Status"
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition-all placeholder-gray-400"
            />
          </div>

          {isAdmin && (
          <button
            onClick={handleCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 hover:shadow active:scale-[0.98] shrink-0"
           >
            <Plus size={18} />
              Shto Turne
            </button>
             )}
            </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 dark:border-slate-800/60 pt-3 mt-1">
            <div className="relative min-w-[160px] flex-1 sm:flex-none">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                <SlidersHorizontal size={14} />
              </div>
              <select
                name="sporti_id"
                value={filters.sporti_id}
                onChange={handleFilterChange}
                className="w-full pl-9 pr-8 py-2 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer font-medium transition-all"
              >
                <option value="">All sports</option>
                {sports.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {sport.emertimi}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative min-w-[160px] flex-1 sm:flex-none">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                <SlidersHorizontal size={14} />
              </div>
              <select
                name="lloji"
                value={filters.lloji}
                onChange={handleFilterChange}
                className="w-full pl-9 pr-8 py-2 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer font-medium transition-all"
              >
                <option value="">All formats</option>
                {tournamentTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative min-w-[160px] flex-1 sm:flex-none">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                <SlidersHorizontal size={14} />
              </div>
              <select
                name="statusi"
                value={filters.statusi}
                onChange={handleFilterChange}
                className="w-full pl-9 pr-8 py-2 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer font-medium transition-all"
              >
                <option value="">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            {isAdmin && (
              <div className="relative min-w-[160px] flex-1 sm:flex-none">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <SlidersHorizontal size={14} />
                </div>
                <select
                  name="organizatori_id"
                  value={filters.organizatori_id}
                  onChange={handleFilterChange}
                  className="w-full pl-9 pr-8 py-2 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer font-medium transition-all"
                >
                  <option value="">All organizers</option>
                  {organizerUsers.map((userItem) => (
                    <option key={userItem.id} value={userItem.id}>
                      {userItem.full_name || userItem.username || userItem.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
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

        <div className={`flex bg-white dark:bg-slate-900 rounded-lg shadow-md overflow-x-auto ${loading ? `opacity-60 pointer-events-none` : ''}`}>
          {filteredTournaments.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Tournament</th>
                  <th className="px-4 py-3 text-left font-semibold">Sport</th>
                  {/* Organizer column is admin-only because organizers do not manage other organizers. */}
                  {isAdmin && <th className="px-4 py-3 text-left font-semibold">Organizer</th>}
                  <th className="px-4 py-3 text-left font-semibold">Format</th>
                  <th className="px-4 py-3 text-center font-semibold">Dates</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Location</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredTournaments.map((tournament) => (
                  <tr key={tournament.id} className="hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors duration-150">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 dark:text-slate-100">
                        {tournament.emertimi}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-slate-400">
                        Registration: {formatCurrency(tournament.cmimi_regjistrimit)} EUR
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-slate-200 font-semibold">
                      {getSportName(tournament.sporti_id)}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                        {getOrganizerName(users, tournament.organizatori_id)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getFormatBadgeClasses(tournament.lloji)}`}
                      >
                        {tournament.lloji || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300 text-center">
                      <div>{formatDate(tournament.data_fillimit)}</div>
                      <div className="text-gray-500 dark:text-slate-400"> 
                        to {formatDate(tournament.data_perfundimit)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClasses(tournament.statusi)}`}
                      >
                        {tournament.statusi || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300 font-semibold">
                      {tournament.lokacioni || "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleView(tournament.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded text-sm font-medium transition duration-200"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        {/* Organizers can view their own tournament here, but edit/delete stays admin-only. */}
                        {isAdmin && (
                          <button
                            onClick={() => handleEdit(tournament.id)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded text-sm font-medium transition duration-200"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(tournament.id)}
                            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded text-sm font-medium transition duration-200"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="w-full px-6 py-12 text-center text-gray-600 dark:text-slate-400">
              {debouncedSearch
                ? `No tournaments match "${debouncedSearch}". Try a different search.`
                : 'No tournaments found. Click "Add Tournament" to add a new one.'}
            </div>
          )}
        </div>
      </div>

          {pagination && (
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl px-4 py-4 sm:px-6 flex items-center justify-between shadow-sm mt-4">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
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
                  {pagination.total && (
                    <>
                      {" "}(Total <span className="font-semibold text-gray-900 dark:text-white">{pagination.total}</span> tournaments)
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

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl dark:bg-slate-800 dark:border dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-200 mb-6">Add Tournament</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <TournamentFormFields
                formData={formData}
                sports={sports}
                users={assignableUsers}
                onChange={handleInputChange}
                canAssignOrganizer={isAdmin}
                formErrors={formErrors}
              />
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg transition duration-200"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && selectedTournament && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseViewModal}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl dark:bg-slate-800 dark:border dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-200 mb-6">Tournament Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Name</label>
                <p className="text-gray-800 dark:text-slate-100 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                  {selectedTournament.emertimi || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Sport</label>
                <p className="text-gray-800 dark:text-slate-100 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                  {getSportName(selectedTournament.sporti_id)}
                </p>
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Organizer</label>
                  <p className="text-gray-800 dark:text-slate-100 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                    {getOrganizerName(users, selectedTournament.organizatori_id)}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Format</label>
                <p className="text-gray-800 dark:text-slate-100 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                  {selectedTournament.lloji || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Status</label>
                <p className="text-gray-800 dark:text-slate-100 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                  {selectedTournament.statusi || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Start Date</label>
                <p className="text-gray-800 dark:text-slate-100 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                  {formatDate(selectedTournament.data_fillimit)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">End Date</label>
                <p className="text-gray-800 dark:text-slate-100 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                  {formatDate(selectedTournament.data_perfundimit)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Location</label>
                <p className="text-gray-800 dark:text-slate-100 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                  {selectedTournament.lokacioni || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Registration Price</label>
                <p className="text-gray-800 dark:text-slate-100 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                  {formatCurrency(selectedTournament.cmimi_regjistrimit)} EUR
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Description</label>
                <p className="text-gray-800 dark:text-slate-100 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg whitespace-pre-wrap">
                  {selectedTournament.pershkrimi || "N/A"}
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

      {isAdmin && showEditModal && selectedTournament && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseEditModal}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl dark:bg-slate-800 dark:border dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-200 mb-6">Edit Tournament</h3>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <TournamentFormFields
                formData={formData}
                sports={sports}
                users={assignableUsers}
                onChange={handleInputChange}
                canAssignOrganizer={isAdmin}
                formErrors={formErrors}
              />
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 rounded-lg transition duration-200"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdmin && showDeleteModal && selectedTournament && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseDeleteModal}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl dark:bg-slate-800 dark:border dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-200 mb-6">Delete Tournament</h3>
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-slate-200">
                Are you sure you want to delete{" "}
                <span className="font-bold text-gray-900 dark:text-slate-100">
                  {selectedTournament.emertimi}
                </span>
                ?
              </p>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition duration-200"
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
        </div>
      )}
    </div>
  );
}
