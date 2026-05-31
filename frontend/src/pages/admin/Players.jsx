import { useCallback, useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import * as yup from "yup";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { API_BASE_URL } from "../../config/api";
import { Alert } from "../../components/Alert";
import { Edit, Trash2, Eye, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import TableSkeleton from "../../components/Skeletons/TableSkeleton"

// Format date from ISO string to readable format (DD/MM/YYYY)
const formatDate = (isoDate) => {
  if (!isoDate) return "N/A";
  try {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "Invalid date";
  }
};

const resolvePlayerFoto = (playerFoto) => {
  if (!playerFoto || typeof playerFoto !== "string") return "";

  const trimmed = playerFoto.trim();
  if (!trimmed) return "";

  if (/^https?:\/\//.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("/players/uploads-players/")) {
    return `${API_BASE_URL}${trimmed}`;
  }
  if (trimmed.startsWith("/uploads-players/")) {
    return `${API_BASE_URL}${trimmed}`;
  }
  return `${API_BASE_URL}/players/uploads-players/${trimmed}`;
};

const playerCreateSchema = yup.object().shape({
  emri: yup.string().min(2, "First name must be at least 2 characters").required("First name is required"),
  mbiemri: yup.string().min(2, "Last name must be at least 2 characters").required("Last name is required"),
  data_lindjes: yup.string().required("Date of birth is required"),
  ekipi_id: yup.string().nullable(),
  pozicioni: yup.string().required("Position is required"),
  numri: yup
    .number()
    .integer()
    .min(1, "Number must be between 1 and 99")
    .max(99, "Number must be between 1 and 99")
    .required("Number is required"),
  gjatesia: yup.number().nullable(),
  pesha: yup.number().nullable(),
  kombesia: yup.string(),
  foto: yup.string(),
});

const playerUpdateSchema = yup.object().shape({
  emri: yup.string().min(2, "First name must be at least 2 characters"),
  mbiemri: yup.string().min(2, "Last name must be at least 2 characters"),
  data_lindjes: yup.string(),
  ekipi_id: yup.string().nullable(),
  pozicioni: yup.string(),
  numri: yup
    .number()
    .integer()
    .min(1, "Number must be between 1 and 99")
    .max(99, "Number must be between 1 and 99")
    .nullable(),
  gjatesia: yup.number().nullable(),
  pesha: yup.number().nullable(),
  kombesia: yup.string(),
  foto: yup.string(),
});

export default function Players() {
  // Uses auth context to gate access to player management operations.
  const { user } = useContext(AuthContext);

  // State Variables
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [sports, setSports] = useState([]);
  const [teamOptions, setTeamOptions] = useState([]);
  const [positionOptions, setPositionOptions] = useState([]);
  const [nationalityOptions, setNationalityOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [alert, setAlert] = useState(null);
  const [uploading, setUploading] = useState(false)
  const [selectedSportId, setSelectedSportId] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    ekipi_id: "",
    pozicioni: "",
    kombesia: "",
  });
  const [formData, setFormData] = useState({
    emri: "",
    mbiemri: "",
    data_lindjes: "",
    ekipi_id: "",
    pozicioni: "",
    numri: "",
    gjatesia: "",
    pesha: "",
    kombesia: "",
    foto: "",
  });
  const [formErrors, setFormErrors] = useState({});

  const currentFotoPreview = formData.foto ? resolvePlayerFoto(formData.foto) : "";

  const handleFotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append("foto", file);
    setUploading(true);
    try {
      const response = await api.post(`/players/upload-player-foto`, data, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      setFormData((prev) => ({ ...prev, foto: response.data.url }));
    } catch (err) {
      const errorMessage = err?.response?.data?.error || err.message;
      setAlert({ type: 'error', message: 'Error uploading photo: ' + errorMessage });
    } finally {
      setUploading(false);
    }
  };

  // Fetch players data from backend via API
  const loadPlayers = useCallback(async (filtersObj) => {
    if (!user?.is_admin) {
      setLoading(false);
      setHasLoaded(true);
      return;
    }
    try {
      setLoading(true);
      setError("");

      const params = {};
      const search = filtersObj.search.trim();

      if (search) params.search = search;
      if (filtersObj.ekipi_id) params.ekipi_id = filtersObj.ekipi_id;
      if (filtersObj.pozicioni) params.pozicioni = filtersObj.pozicioni;
      if (filtersObj.kombesia) params.kombesia = filtersObj.kombesia;

      const [playersResponse, teamsResponse, sportsResponse] = await Promise.all([
        api.get(`/players`, { params }),
        api.get(`/teams`),
        api.get(`/sports`),
      ]);

      const playersData = Array.isArray(playersResponse.data) ? playersResponse.data : [];
      const teamsData = teamsResponse.data;
      const sportsData = sportsResponse.data;

      setPlayers(playersData);
      setTeams(teamsData);
      setSports(Array.isArray(sportsData) ? sportsData : []);

      // Extract unique teams
      const uniqueTeams = Array.from(
        new Map(
          teamsData.map((team) => [team.id, team.emertimi])
        ).entries()
      ).map(([id, emertimi]) => ({ id, emertimi }));
      setTeamOptions(uniqueTeams);

      // Extract unique positions
      const uniquePositions = Array.from(
        new Set(
          playersData
            .map((p) => p.pozicioni)
            .filter(Boolean)
            .map((p) => p.trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));
      setPositionOptions(uniquePositions);

      // Extract unique nationalities
      const uniqueNationalities = Array.from(
        new Set(
          playersData
            .map((p) => p.kombesia)
            .filter(Boolean)
            .map((p) => p.trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));
      setNationalityOptions(uniqueNationalities);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    loadPlayers(filters);
  }, [filters, loadPlayers]);

  // Create players handlers

  const handleCreate = () => {
    setSelectedSportId("");
    setShowModal(true);
  };

  const handleClearFilters = () => {
    setFilters({ search: "", ekipi_id: "", pozicioni: "", kombesia: "" });
  };

  const hasActiveFilters = filters.search.trim() !== "" || filters.ekipi_id !== "" || filters.pozicioni !== "" || filters.kombesia !== "";

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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getTeamSelectValue = (teamValue) => {
    // Normalizes mixed team values to an id string accepted by the select input.
    if (!teamValue) return "";

    const matchedTeam = teams.find(
      (team) => String(team.id) === String(teamValue) || team.emertimi === teamValue,
    );

    return matchedTeam ? String(matchedTeam.id) : "";
  };

  const buildPlayerPayload = () => ({
    // Sends null when no team is selected to match backend expectations.
    ...formData,
    ekipi_id: formData.ekipi_id || null,
  });

  const filteredTeams = selectedSportId
    ? teams.filter((team) => String(team.sporti_id) === String(selectedSportId))
    : teams;

  // Handle form submission (Create)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await playerCreateSchema.validate(formData, { abortEarly: false });
      await api.post(`/players`, buildPlayerPayload());

      setFormData({
        emri: "",
        mbiemri: "",
        data_lindjes: "",
        ekipi_id: "",
        pozicioni: "",
        numri: "",
        gjatesia: "",
        pesha: "",
        kombesia: "",
        foto: "",
      });
      setFormErrors({});
      setSelectedSportId("");
      setShowModal(false);
      
      await loadPlayers(filters);
      setAlert({ type: 'success', message: 'Player created successfully!' });
    } catch (err) {
      if (err.inner) {
        const validationErrors = {};
        err.inner.forEach((error) => {
          validationErrors[error.path] = error.message;
        });
        setFormErrors(validationErrors);
      } else {
        const errorMessage = err?.response?.data?.error || err.message;
        setAlert({ type: 'error', message: 'Error creating player: ' + errorMessage });
      }
    }
  };

  const handleCloseModal = () => {
    setFormData({
      emri: "",
      mbiemri: "",
      data_lindjes: "",
      ekipi_id: "",
      pozicioni: "",
      numri: "",
      gjatesia: "",
      pesha: "",
      kombesia: "",
      foto: "",
    });
    setFormErrors({});
    setSelectedSportId("");
    setShowModal(false);
  };

  // Modal close handlers

  const handleCloseEditModal = () => {
    setFormData({
      emri: "",
      mbiemri: "",
      data_lindjes: "",
      ekipi_id: "",
      pozicioni: "",
      numri: "",
      gjatesia: "",
      pesha: "",
      kombesia: "",
      foto: "",
    });
    setSelectedSportId("");
    setSelectedPlayer(null);
    setShowEditModal(false);
  };

  const handleCloseViewModal = () => {
    setSelectedPlayer(null);
    setShowViewModal(false);
  };

  const handleCloseDeleteModal = () => {
    setSelectedPlayer(null);
    setShowDeleteModal(false);
  };

  // Button handlers

  const handleView = (id) => {
    const player = players.find((e) => e.id === id);
    setSelectedPlayer(player);
    setShowViewModal(true);
  };

  const handleEdit = (id) => {
    const player = players.find((e) => e.id === id);
    if (!player) return;
    setSelectedPlayer(player);

    setFormData({
      emri: player.emri,
      mbiemri: player.mbiemri,
      data_lindjes: player.data_lindjes ? player.data_lindjes.split("T")[0] : "",
      ekipi_id: getTeamSelectValue(player.ekipi_id),
      pozicioni: player.pozicioni,
      numri: player.numri,
      gjatesia: player.gjatesia,
      pesha: player.pesha,
      kombesia: player.kombesia,
      foto: player.foto || "",
    });
    const matchedTeam = teams.find((team) => String(team.id) === String(getTeamSelectValue(player.ekipi_id)));
    setSelectedSportId(matchedTeam?.sporti_id ? String(matchedTeam.sporti_id) : "");
    setShowEditModal(true);
  };

  const handleDelete = (id) => {
    const player = players.find((e) => e.id === id);

    setSelectedPlayer(player);
    setShowDeleteModal(true);
  };

  // API handlers

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlayer) return;

    try {
      await playerUpdateSchema.validate(formData, { abortEarly: false });
      await api.put(`/players/${selectedPlayer.id}`, buildPlayerPayload());

      setFormData({
        emri: "",
        mbiemri: "",
        data_lindjes: "",
        ekipi_id: "",
        pozicioni: "",
        numri: "",
        gjatesia: "",
        pesha: "",
        kombesia: "",
        foto: "",
      });
      setFormErrors({});
      setSelectedSportId("");

      setSelectedPlayer(null);
      setShowEditModal(false);
      
      await loadPlayers(filters);
      setAlert({ type: 'success', message: 'Player updated successfully!' });
    } catch (err) {
      if (err.inner) {
        const validationErrors = {};
        err.inner.forEach((error) => {
          validationErrors[error.path] = error.message;
        });
        setFormErrors(validationErrors);
      } else {
        const errorMessage = err?.response?.data?.error || err.message;
        setAlert({ type: 'error', message: 'Error updating player: ' + errorMessage });
      }
    }
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!selectedPlayer) return;

    try {
      await api.delete(`/players/${selectedPlayer.id}`);

      setSelectedPlayer(null);
      setShowDeleteModal(false);
      
      await loadPlayers(filters);
      setAlert({ type: 'success', message: 'Player deleted successfully!' });
    } catch (err) {
      setAlert({ type: 'error', message: 'Error deleting player: ' + err.message });
    }
  };

  // Conditional loading / Skeleton loading

  // Redirects unauthorized users away from admin-only pages.
  if (!user || !user.is_admin) {
    return <Navigate to="/login" replace />;
  }

  if (loading){ 
    return (
      <div className="delay-skeleton">
        <TableSkeleton />
      </div>
    )
  }

  if (error)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg text-red-600 dark:text-red-400">Error: {error}</p>
      </div>
    );

  const filteredPlayers = players;

  // Main components

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4">
      {alert && (
        <Alert 
          type={alert.type} 
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      <div className="w-full mx-auto space-y-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-5">Player Management</h2>
          
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="relative flex-1 max-w-2xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Search by player name..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition-all placeholder-gray-400"
                />
              </div>

              <button
                onClick={handleCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 hover:shadow active:scale-[0.98] shrink-0"
              >
                <Plus size={18} />
                Add Player
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 dark:border-slate-800/60 pt-3 mt-1">
              <div className="relative min-w-[160px] flex-1 sm:flex-none">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <SlidersHorizontal size={14} />
                </div>
                <select
                  name="ekipi_id"
                  value={filters.ekipi_id}
                  onChange={handleFilterChange}
                  className="w-full pl-9 pr-8 py-2 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer font-medium transition-all"
                >
                  <option value="">All Teams</option>
                  {teamOptions.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.emertimi}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative min-w-[160px] flex-1 sm:flex-none">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <SlidersHorizontal size={14} />
                </div>
                <select
                  name="pozicioni"
                  value={filters.pozicioni}
                  onChange={handleFilterChange}
                  className="w-full pl-9 pr-8 py-2 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer font-medium transition-all"
                >
                  <option value="">All Positions</option>
                  {positionOptions.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative min-w-[160px] flex-1 sm:flex-none">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <SlidersHorizontal size={14} />
                </div>
                <select
                  name="kombesia"
                  value={filters.kombesia}
                  onChange={handleFilterChange}
                  className="w-full pl-9 pr-8 py-2 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer font-medium transition-all"
                >
                  <option value="">All Nationalities</option>
                  {nationalityOptions.map((nationality) => (
                    <option key={nationality} value={nationality}>
                      {nationality}
                    </option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs font-semibold text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-all flex items-center justify-center gap-1 shrink-0 animate-in fade-in slide-in-from-left-2 duration-200 cursor-pointer ml-auto"
              >
                <X size={16} />
                Clear Filters
              </button>
              )}
            </div>
          </div>
        </div>
        {/* Player table section */}
        <div className="flex-1 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead className="bg-gray-800 dark:bg-slate-800 text-white">
              <tr>
                <th className="px-6 py-4 text-center font-semibold">ID</th>
                <th className="px-6 py-4 text-left font-semibold">Name</th>
                <th className="px-6 py-4 text-left font-semibold">Last Name</th>
                <th className="px-6 py-4 text-center font-semibold">Birthday</th>
                <th className="px-6 py-4 text-left font-semibold">Team</th>
                <th className="px-6 py-4 text-left font-semibold">Position</th>
                <th className="px-6 py-4 text-left font-semibold">Number</th>
                <th className="px-6 py-4 text-left font-semibold">Height</th>
                <th className="px-6 py-4 text-left font-semibold">Weight</th>
                <th className="px-6 py-4 text-left font-semibold">
                  Nationality
                </th>
                <th className="px-6 py-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            {/* Table Body */}
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {filteredPlayers.length > 0 ? (
                filteredPlayers.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400 text-center">
                      {s.id}
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-slate-100 font-semibold">
                      {s.emri}
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-slate-100 font-semibold">
                      {s.mbiemri}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-slate-300 text-center">
                      {formatDate(s.data_lindjes)}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                      {s.ekipi_emri || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                      {s.pozicioni}
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-slate-100 font-semibold">
                      {s.numri}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                      {s.gjatesia}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                      {s.pesha}
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-slate-100 font-semibold">
                      {s.kombesia}
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
                    colSpan="11"
                    className="px-6 py-4 text-center text-gray-600 dark:text-slate-400"
                  >
                    {hasActiveFilters ? 'No players match these filters.' : 'No players found. Click "Add Player" to add a new one.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ADD NEW PLAYER MODAL */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseModal}
          >
            <div
              className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-6">
                <div className="border-2 border-gray-200 dark:border-slate-700 rounded-xl p-4 flex flex-col">
                  <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Player Profile Image</p>
                  <div className="h-[340px] border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-slate-700 overflow-hidden">
                    {currentFotoPreview ? (
                      <img
                        src={currentFotoPreview}
                        alt="Player profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <p className="text-center text-gray-500 dark:text-slate-400 font-medium px-4">PLAYER IMAGE</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mt-4 mb-2">
                      Player Profile
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleFotoUpload}
                      className="w-full text-sm text-gray-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-50 dark:file:bg-green-500/10 file:text-green-700 dark:file:text-green-400 hover:file:bg-green-100 dark:hover:file:bg-green-500/20"
                    />
                    {uploading && <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Uploading...</p>}
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-200 mb-6">Add New Player</h3>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First name input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="emri"
                      value={formData.emri}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border ${formErrors.emri ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200`}
                      placeholder="First Name"
                      required
                    />
                    {formErrors.emri && <p className="text-sm text-red-500 mt-1">{formErrors.emri}</p>}
                  </div>
                  {/* Last name input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="mbiemri"
                      value={formData.mbiemri}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border ${formErrors.mbiemri ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200`}
                      placeholder="Last Name"
                      required
                    />
                    {formErrors.mbiemri && <p className="text-sm text-red-500 mt-1">{formErrors.mbiemri}</p>}
                  </div>

                  {/* Date of Birth input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      name="data_lindjes"
                      value={formData.data_lindjes}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border ${formErrors.data_lindjes ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200`}
                      placeholder="****-**-**"
                      required
                    />
                    {formErrors.data_lindjes && <p className="text-sm text-red-500 mt-1">{formErrors.data_lindjes}</p>}
                  </div>
                  {/* Team input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Sport Filter
                    </label>
                    <select
                      value={selectedSportId}
                      onChange={(e) => {
                        setSelectedSportId(e.target.value);
                        setFormData((prev) => ({ ...prev, ekipi_id: "" }));
                      }}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
                    >
                      <option value="">All sports</option>
                      {sports.map((sport) => (
                        <option key={sport.id} value={sport.id}>
                          {sport.emertimi}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Team
                    </label>
                    <select
                      name="ekipi_id"
                      value={formData.ekipi_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
                    >
                      <option value="">No Team</option>
                      {filteredTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.emertimi}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Position input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Position
                    </label>
                    <input
                      type="text"
                      name="pozicioni"
                      value={formData.pozicioni}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
                      placeholder="Pozition"
                    />
                  </div>
                  {/* Number input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Number
                    </label>
                    <input
                      type="text"
                      name="numri"
                      value={formData.numri}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
                      placeholder="1,2,3..."
                    />
                  </div>
                  {/* Hight input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Hight *
                    </label>
                    <input
                      type="text"
                      name="gjatesia"
                      value={formData.gjatesia}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border ${formErrors.gjatesia ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200`}
                      placeholder="150cm..."
                      required
                    />
                    {formErrors.gjatesia && <p className="text-sm text-red-500 mt-1">{formErrors.gjatesia}</p>}
                  </div>
                  {/* Weight input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Weight *
                    </label>
                    <input
                      type="text"
                      name="pesha"
                      value={formData.pesha}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border ${formErrors.pesha ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200`}
                      placeholder="Weight"
                      required
                    />
                    {formErrors.pesha && <p className="text-sm text-red-500 mt-1">{formErrors.pesha}</p>}
                  </div>
                  {/* Nationality input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Nationality *
                    </label>
                    <input
                      type="text"
                      name="kombesia"
                      value={formData.kombesia}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border ${formErrors.kombesia ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200`}
                      placeholder="Shqiptar..."
                      required
                    />
                    {formErrors.kombesia && <p className="text-sm text-red-500 mt-1">{formErrors.kombesia}</p>}
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
                        className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* View player modaal*/}
        {showViewModal && selectedPlayer && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseViewModal}
          >
            <div
              className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-6">
                <div className="border-2 border-gray-200 dark:border-slate-700 rounded-xl p-4 flex flex-col">
                  <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Player Profile Image</p>
                  <div className="h-[340px] border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-slate-700 overflow-hidden">
                    {selectedPlayer.foto ? (
                      <img
                        src={resolvePlayerFoto(selectedPlayer.foto)}
                        alt={`${selectedPlayer.emri} profile`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <p className="text-center text-gray-500 dark:text-slate-400 font-medium px-4">PLAYER IMAGE</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-200 mb-6">Player Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Player Name
                  </label>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                    {selectedPlayer.emri}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Last Name
                  </label>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                    {selectedPlayer.mbiemri}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Birth Day
                  </label>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                    {selectedPlayer.data_lindjes}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Ekipi
                  </label>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                    {selectedPlayer.ekipi_id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Position
                  </label>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                    {selectedPlayer.pozicioni}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Number
                  </label>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                    {selectedPlayer.numri}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Hight
                  </label>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                    {selectedPlayer.gjatesia}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Weight
                  </label>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                    {selectedPlayer.pesha}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Nationality
                  </label>
                  <p className="text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                    {selectedPlayer.kombesia}
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
            </div>
          </div>
        )}

        {/* Edit player modal */}
        {showEditModal && selectedPlayer && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseEditModal}
          >
            <div
              className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-6">
                <div className="border-2 border-gray-200 dark:border-slate-700 rounded-xl p-4 flex flex-col">
                  <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Player Profile Image</p>
                  <div className="h-[340px] border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-slate-700 overflow-hidden">
                    {currentFotoPreview ? (
                      <img
                        src={currentFotoPreview}
                        alt="Player profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <p className="text-center text-gray-500 dark:text-slate-400 font-medium px-4">PLAYER PROFILE IMAGE HERE</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Player Profile
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFotoUpload}
                      className="w-full text-sm text-gray-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-50 dark:file:bg-green-500/10 file:text-green-700 dark:file:text-green-400 hover:file:bg-green-100 dark:hover:file:bg-green-500/20"
                    />
                    {uploading && <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Uploading...</p>}
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-200 mb-6">Edit Player</h3>
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First name input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="emri"
                      value={formData.emri}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
                      placeholder="First Name"
                      required
                    />
                  </div>
                  {/* Last name input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="mbiemri"
                      value={formData.mbiemri}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
                      placeholder="Last Name"
                      required
                    />
                  </div>

                  {/* Date of Birth input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      name="data_lindjes"
                      value={formData.data_lindjes}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
                      placeholder="****-**-**"
                      required
                    />
                  </div>
                  {/* Team input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Sport Filter
                    </label>
                    <select
                      value={selectedSportId}
                      onChange={(e) => {
                        setSelectedSportId(e.target.value);
                        setFormData((prev) => ({ ...prev, ekipi_id: "" }));
                      }}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
                    >
                      <option value="">All sports</option>
                      {sports.map((sport) => (
                        <option key={sport.id} value={sport.id}>
                          {sport.emertimi}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Team
                    </label>
                    <select
                      name="ekipi_id"
                      value={formData.ekipi_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
                    >
                      <option value="">No Team</option>
                      {filteredTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.emertimi}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Position input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Position
                    </label>
                    <input
                      type="text"
                      name="pozicioni"
                      value={formData.pozicioni}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
                      placeholder="Pozition"
                    />
                  </div>
                  {/* Number input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Number
                    </label>
                    <input
                      type="text"
                      name="numri"
                      value={formData.numri}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
                      placeholder="1,2,3..."
                    />
                  </div>
                  {/* Hight input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Hight *
                    </label>
                    <input
                      type="text"
                      name="gjatesia"
                      value={formData.gjatesia}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
                      placeholder="150cm..."
                      required
                    />
                  </div>
                  {/* Weight input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Weight *
                    </label>
                    <input
                      type="text"
                      name="pesha"
                      value={formData.pesha}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
                      placeholder="Weight"
                      required
                    />
                  </div>
                  {/* Nationality input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Nationality *
                    </label>
                    <input
                      type="text"
                      name="kombesia"
                      value={formData.kombesia}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-slate-200"
                      placeholder="Shqiptar..."
                      required
                    />
                  </div>
                    </div>
                    {/* Edit form buttons - Save Changes */}
                    <div className="flex gap-4 pt-4">
                      <button
                        type="submit"
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 rounded-lg transition duration-200"
                      >
                        Save Changes
                      </button>
                      {/* Cancel button */}
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
            </div>
          </div>
        )}

        {/* Confirm Delete Modal */}
        {showDeleteModal && selectedPlayer && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseDeleteModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Delete Player?</h3>

                <p className="text-gray-700 dark:text-slate-300 mb-6">
                    Are you sure you want to delete <strong>{selectedPlayer.emri} {selectedPlayer.mbiemri}</strong> This action cannot be undone.
                </p>
                {/* Confirm delete button */}
                <div className="flex gap-4">
                    <button
                    onClick={handleDeleteConfirm}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-lg transition duration-200"
                    >
                        Delete
                    </button>

                    <button
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
