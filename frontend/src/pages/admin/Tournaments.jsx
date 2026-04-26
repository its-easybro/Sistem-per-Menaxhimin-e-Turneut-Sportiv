import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";

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

function validateTournamentForm(formData) {
  // Validates required fields and business rules before API submission.
  if (!formData.emertimi.trim()) {
    return "Tournament name is required.";
  }

  if (!formData.sporti_id) {
    return "Sport is required.";
  }

  if (!tournamentTypeOptions.includes(formData.lloji)) {
    return "Please choose a valid tournament format.";
  }

  if (!statusOptions.includes(formData.statusi)) {
    return "Please choose a valid tournament status.";
  }

  if (!formData.data_fillimit || !formData.data_perfundimit) {
    return "Start date and end date are required.";
  }

  const startDate = new Date(formData.data_fillimit);
  const endDate = new Date(formData.data_perfundimit);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    return "Please provide valid tournament dates.";
  }

  if (endDate <= startDate) {
    return "End date must be after the start date.";
  }

  const registrationPrice = Number(formData.cmimi_regjistrimit);

  if (!Number.isFinite(registrationPrice) || registrationPrice < 0) {
    return "Registration price must be a valid non-negative number.";
  }
}

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
  if (status === "Përfunduar") return "bg-gray-200 text-gray-700";
  if (status === "Anuluar") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
}

function getFormatBadgeClasses(format) {
  // Maps tournament format values to badge color classes.
  if (format === "Liga") return "bg-purple-100 text-purple-700";
  if (format === "Grup + Eliminim") return "bg-amber-100 text-amber-700";
  if (format === "Vetëm Grup") return "bg-sky-100 text-sky-700";
  if (format === "Vetëm Eliminim") return "bg-indigo-100 text-indigo-700";
  return "bg-gray-100 text-gray-700";
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
//NEW 
function getOrganizerName(users, organizerId) {
  const organizer = users.find ((item) => item.id === organizerId);
  return organizer?.full_name || organizer?.username || "N/A";
}



function TournamentFormFields({ formData, sports, users, onChange, canAssignOrganizer }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Tournament Name</span>
        <input
          type="text"
          name="emertimi"
          value={formData.emertimi}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
          required
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Sport</span>
        <select
          name="sporti_id"
          value={formData.sporti_id}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
          required
        >
          <option value="">Select sport</option>
          {sports.map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.emertimi}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Format</span>
        <select
          name="lloji"
          value={formData.lloji}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
          required
        >
          <option value="">Select format</option>
          {tournamentTypeOptions.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Status</span>
        <select
          name="statusi"
          value={formData.statusi}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Start Date</span>
        <input
          type="date"
          name="data_fillimit"
          value={formData.data_fillimit}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
          required
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">End Date</span>
        <input
          type="date"
          name="data_perfundimit"
          value={formData.data_perfundimit}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
          required
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Location</span>
        <input
          type="text"
          name="lokacioni"
          value={formData.lokacioni}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
        />
      </label>

      {canAssignOrganizer && (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700">Assign Organizer</span>
          <select
            name="organizatori_id"
            value={formData.organizatori_id}
            onChange={onChange}
            className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
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
        <span className="text-sm font-medium text-gray-700">Registration Price</span>
        <input
          type="number"
          min="0"
          step="0.01"
          name="cmimi_regjistrimit"
          value={formData.cmimi_regjistrimit}
          onChange={onChange}
          className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
        />
      </label>

      <label className="flex flex-col gap-2 md:col-span-2">
        <span className="text-sm font-medium text-gray-700">Description</span>
        <textarea
          name="pershkrimi"
          value={formData.pershkrimi}
          onChange={onChange}
          rows={4}
          className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
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
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [alert, setAlert] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  // Loads tournaments and sports in parallel for table and form dropdowns.
  useEffect(() => {
    const loadTournaments = async () => {
      // Blocks users without admin/organizer roles from loading tournament data.
      if (!canManageTournaments) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const requests = [
          api.get(`/tournaments`),
          api.get(`/sports`),
        ];

        if (isAdmin) {
          requests.push(api.get(`/users`));
        }

        // For organizers, `/tournaments` is already filtered in the backend
        // so this page receives only the tournament(s) assigned to them.
        const [tournamentsRes, sportsRes, usersRes] = await Promise.all(requests);

        const tournamentsData = tournamentsRes.data;
        const sportsData = sportsRes.data;

        setTournaments(Array.isArray(tournamentsData) ? tournamentsData : []);
        setSports(Array.isArray(sportsData) ? sportsData : []);
        setUsers(Array.isArray(usersRes?.data) ? usersRes.data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadTournaments();
  }, [canManageTournaments, isAdmin]);

  const resetForm = () => {
    setFormData(initialFormData);
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const validationError = validateTournamentForm(formData);
      if (validationError) {
        alert(validationError);
        return;
      }

      const response = await api.post(`/tournaments`, buildPayload());
      const data = response.data || {};

      setTournaments((prev) => [...prev, data]);
      handleCloseModal();
      setAlert({ type: 'success', message: 'Tournament created successfully!' });
    } catch (err) {
      setAlert({ type: 'error', message: 'Error creating tournament: ' + err.message });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!selectedTournament) return;

    try {
      const validationError = validateTournamentForm(formData);
      if (validationError) {
        alert(validationError);
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
      setAlert({ type: 'error', message: 'Error updating tournament: ' + err.message });
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
      setAlert({ type: 'error', message: 'Error deleting tournament: ' + err.message });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Applies search against tournament name, sport, location, and status.
  const filteredTournaments = tournaments.filter((item) => {
    const query = searchQuery.toLowerCase();

    return (
      item.emertimi?.toLowerCase().includes(query) ||
      item.lloji?.toLowerCase().includes(query) ||
      item.lokacioni?.toLowerCase().includes(query) ||
      item.statusi?.toLowerCase().includes(query) ||
      getSportName(item.sporti_id).toLowerCase().includes(query)
    );
  });

  // Organizers can open this page too, but only for their assigned tournament data.
  if (!user || !canManageTournaments) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-gray-50 px-4">
        <div className="rounded-xl bg-white px-6 py-4 text-sm font-medium text-gray-700 shadow-sm">
          Loading tournaments...
        </div>
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
    <div className="bg-gray-50 p-4">
      {alert && (
        <Alert 
          type={alert.type} 
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      <div className="w-full mx-auto space-y-6">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Tournament Management
            </h2>

            {/* Only admins can create tournaments or assign organizers. */}
            {isAdmin && (
              <button
                onClick={handleCreate}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-200 ease-in-out"
              >
                + Add Tournament
              </button>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, sport, format, location, or status"
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

        <div className="flex bg-white rounded-lg shadow-md overflow-x-auto">
          {filteredTournaments.length === 0 ? (
            <div className="w-full px-6 py-12 text-center text-gray-600">
              {searchQuery ? `No tournaments match "${searchQuery}". Try a different search.` : 'No tournaments found. Click "Add Tournament" to add a new one.'}
            </div>
          ) : (
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
              <tbody className="divide-y divide-gray-200">
                {filteredTournaments.map((tournament) => (
                  <tr key={tournament.id} className="hover:bg-gray-100 transition-colors duration-150">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">
                        {tournament.emertimi}
                      </div>
                      <div className="text-sm text-gray-500">
                        Registration: {formatCurrency(tournament.cmimi_regjistrimit)} EUR
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-semibold">
                      {getSportName(tournament.sporti_id)}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {getOrganizerName(users, tournament.organizatori_id)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getFormatBadgeClasses(tournament.lloji)}`}
                      >
                        {tournament.lloji || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-center">
                      <div>{formatDate(tournament.data_fillimit)}</div>
                      <div className="text-gray-500"> 
                        to {formatDate(tournament.data_perfundimit)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClasses(tournament.statusi)}`}
                      >
                        {tournament.statusi || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-semibold">
                      {tournament.lokacioni || "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleView(tournament.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200"
                        >
                          View
                        </button>
                        {/* Organizers can view their own tournament here, but edit/delete stays admin-only. */}
                        {isAdmin && (
                          <button
                            onClick={() => handleEdit(tournament.id)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200"
                          >
                            Edit
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(tournament.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Add Tournament</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <TournamentFormFields
                formData={formData}
                sports={sports}
                users={users}
                onChange={handleInputChange}
                canAssignOrganizer={isAdmin}
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
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Tournament Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                  {selectedTournament.emertimi || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sport</label>
                <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                  {getSportName(selectedTournament.sporti_id)}
                </p>
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organizer</label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {getOrganizerName(users, selectedTournament.organizatori_id)}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                  {selectedTournament.lloji || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                  {selectedTournament.statusi || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                  {formatDate(selectedTournament.data_fillimit)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                  {formatDate(selectedTournament.data_perfundimit)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                  {selectedTournament.lokacioni || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Price</label>
                <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                  {formatCurrency(selectedTournament.cmimi_regjistrimit)} EUR
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg whitespace-pre-wrap">
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
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Edit Tournament</h3>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <TournamentFormFields
                formData={formData}
                sports={sports}
                users={users}
                onChange={handleInputChange}
                canAssignOrganizer={isAdmin}
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
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Delete Tournament</h3>
            <div className="space-y-4">
              <p className="text-gray-700">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-gray-900">
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
