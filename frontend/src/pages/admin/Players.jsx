import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { API_BASE_URL } from "../../config/api";
import { Alert } from "../../components/Alert";

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

export default function Players() {
  // Uses auth context to gate access to player management operations.
  const { user } = useContext(AuthContext);

  // State Variables
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [alert, setAlert] = useState(null);
  const [uploading, setUploading] = useState(false)
  const [selectedSportId, setSelectedSportId] = useState("");
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
  useEffect(() => {
    const loadPlayers = async () => {
      if (!user?.is_admin) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [playersResponse, teamsResponse, sportsResponse] = await Promise.all([
          api.get(`/players`),
          api.get(`/teams`),
          api.get(`/sports`),
        ]);

        const playersData = playersResponse.data;
        const teamsData = teamsResponse.data;
        const sportsData = sportsResponse.data;

        setPlayers(playersData);
        setTeams(teamsData);
        setSports(Array.isArray(sportsData) ? sportsData : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadPlayers();
  }, [user]);

  // Create players handlers

  const handleCreate = () => {
    setSelectedSportId("");
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
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
      const response = await api.post(`/players`, buildPlayerPayload());

      const newPlayer = response.data;

      setPlayers([...players, newPlayer]);

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
      setShowModal(false);
      
      setAlert({ type: 'success', message: 'Player created successfully!' });
    } catch (err) {
      const errorMessage = err?.response?.data?.error || err.message;
      setAlert({ type: 'error', message: 'Error creating player: ' + errorMessage });
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
      const response = await api.put(`/players/${selectedPlayer.id}`, buildPlayerPayload());

      const updatedPlayer = response.data;

      setPlayers(
        players.map((e) => (e.id === updatedPlayer.id ? updatedPlayer : e)),
      );

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
      setAlert({ type: 'success', message: 'Player updated successfully!' });
    } catch (err) {
      const errorMessage = err?.response?.data?.error || err.message;
      setAlert({ type: 'error', message: 'Error updating player: ' + errorMessage });
    }
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!selectedPlayer) return;

    try {
      await api.delete(`/players/${selectedPlayer.id}`);

      setPlayers(players.filter((e) => e.id !== selectedPlayer.id));

      setSelectedPlayer(null);
      setShowDeleteModal(false);
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

  function renderSkeleton() {
    return (
      <div className="bg-gray-50 p-4">
        <div className="w-full mx-auto animate-pulse">
          {/* Header and Add button */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <div className="h-8 bg-gray-300 rounded w-64"></div>
              <div className="h-10 bg-gray-300 rounded w-32"></div>
            </div>
            {/* Search bar placeholder */}
            <div className="relative">
              <div className="h-12 bg-gray-300 rounded-lg w-full"></div>
            </div>
          </div>

          {/* Table placeholder */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3">
                    <div className="h-4 bg-gray-600 rounded w-8"></div>
                  </th>
                  <th className="px-4 py-3">
                    <div className="h-4 bg-gray-600 rounded w-32"></div>
                  </th>
                  <th className="px-4 py-3">
                    <div className="h-4 bg-gray-600 rounded w-24"></div>
                  </th>
                  <th className="px-4 py-3">
                    <div className="h-4 bg-gray-600 rounded w-32"></div>
                  </th>
                  <th className="px-4 py-3">
                    <div className="h-4 bg-gray-600 rounded w-12"></div>
                  </th>
                  <th className="px-4 py-3">
                    <div className="h-4 bg-gray-600 rounded w-32"></div>
                  </th>
                  <th className="px-4 py-3">
                    <div className="h-4 bg-gray-600 rounded w-20 mx-auto"></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...Array(5)].map((_, index) => (
                  <tr key={index} className="bg-white">
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-10"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-40"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-8"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </td>
                    <td className="px-4 py-3">
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

  if (loading) return renderSkeleton();

  if (error)
    return (
      <div className="flex justify-center items-center h-center">
        <p className="text-lg text-red-600">Error: {error}</p>
      </div>
    );

  // Main components

  return (
    <div className="bg-gray-50 p-4">
      {alert && (
        <Alert 
          type={alert.type} 
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      <div className="w-full mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Player Management
            </h2>
            <button
              onClick={handleCreate}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-200 ease-in-out"
            >
              + Add New Player
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="relative">
            <input
              type="text"
              name="search"
              placeholder="Search player"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-transparent sm:placeholder:text-gray-400"
            />
            {/* Search Icon (magnifying glass) */}
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
        {/* Player table section */}
        <div className="flex bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-3 text-center font-semibold">ID</th>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Last Name</th>
                <th className="px-4 py-3 text-center font-semibold">Birthday</th>
                <th className="px-4 py-3 text-left font-semibold">Team</th>
                <th className="px-4 py-3 text-left font-semibold">Pozition</th>
                <th className="px-4 py-3 text-left font-semibold">Number</th>
                <th className="px-4 py-3 text-left font-semibold">Hight</th>
                <th className="px-4 py-3 text-left font-semibold">Wheight</th>
                <th className="px-4 py-3 text-left font-semibold">
                  Nationality
                </th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            {/* Table Body */}
            <tbody className="divide-y divide-gray-200">
              {players.filter((s) =>
                s.emri.toLowerCase().includes(searchQuery.toLowerCase()),
              ).length > 0 ? (
                players
                  .filter((s) =>
                    s.emri.toLowerCase().includes(searchQuery.toLowerCase()),
                  )
                  .map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-gray-100 transtion-colors duration-150"
                    >
                      <td className="px-4 py-3 text-gray-500 text-center">
                        {s.id}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-semibold">
                        {s.emri}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-semibold">
                        {s.mbiemri}
                      </td>
                      <td className="px-4 py-3 text-gray-800 text-center">
                        {formatDate(s.data_lindjes)}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-semibold">
                        {s.ekipi_id}
                      </td>
                      <td className="px-4 py-3 text-gray-800">
                        {s.pozicioni}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-semibold">
                        {s.numri}
                      </td>
                      <td className="px-4 py-3 text-gray-800">
                        {s.gjatesia}
                      </td>
                      <td className="px-4 py-3 text-gray-800">
                        {s.pesha}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-semibold">
                        {s.kombesia}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleView(s.id)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEdit(s.id)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-4 text-center text-gray-600"
                  >
                    {searchQuery
                      ? `No player match "${searchQuery}". Try a differen search.`
                      : 'No players found. Click "Add New Player" to add a new one.'}
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
              className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-6">
                <div className="border-2 border-gray-200 rounded-xl p-4 flex flex-col">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Player Profile Image</p>
                  <div className="h-[340px] border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden">
                    {currentFotoPreview ? (
                      <img
                        src={currentFotoPreview}
                        alt="Player profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <p className="text-center text-gray-500 font-medium px-4">PLAYER IMAGE</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mt-4 mb-2">
                      Player Profile
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleFotoUpload}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    {uploading && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
                  </div>
                </div>
                <div>
                  <h3 className="text-2x1 font-bold text-gray-800 mb-6">Add New Player</h3>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First name input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="emri"
                      value={formData.emri}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border borde-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="First Name"
                      required
                    />
                  </div>
                  {/* Last name input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="mbiemri"
                      value={formData.mbiemri}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Last Name"
                      required
                    />
                  </div>

                  {/* Date of Birth input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      name="data_lindjes"
                      value={formData.data_lindjes}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="****-**-**"
                      required
                    />
                  </div>
                  {/* Team input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sport Filter
                    </label>
                    <select
                      value={selectedSportId}
                      onChange={(e) => {
                        setSelectedSportId(e.target.value);
                        setFormData((prev) => ({ ...prev, ekipi_id: "" }));
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team
                    </label>
                    <select
                      name="ekipi_id"
                      value={formData.ekipi_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Position
                    </label>
                    <input
                      type="text"
                      name="pozicioni"
                      value={formData.pozicioni}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Pozition"
                    />
                  </div>
                  {/* Number input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number
                    </label>
                    <input
                      type="text"
                      name="numri"
                      value={formData.numri}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="1,2,3..."
                    />
                  </div>
                  {/* Hight input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hight *
                    </label>
                    <input
                      type="text"
                      name="gjatesia"
                      value={formData.gjatesia}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="150cm..."
                      required
                    />
                  </div>
                  {/* Weight input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weight *
                    </label>
                    <input
                      type="text"
                      name="pesha"
                      value={formData.pesha}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Weight"
                      required
                    />
                  </div>
                  {/* Nationality input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nationality *
                    </label>
                    <input
                      type="text"
                      name="kombesia"
                      value={formData.kombesia}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Shqiptar..."
                      required
                    />
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
              className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-6">
                <div className="border-2 border-gray-200 rounded-xl p-4 flex flex-col">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Player Profile Image</p>
                  <div className="h-[340px] border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden">
                    {selectedPlayer.foto ? (
                      <img
                        src={resolvePlayerFoto(selectedPlayer.foto)}
                        alt={`${selectedPlayer.emri} profile`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <p className="text-center text-gray-500 font-medium px-4">PLAYER IMAGE</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-2x1 font-bold text-gray-800 mb-6">Player Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Player Name
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {selectedPlayer.emri}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {selectedPlayer.mbiemri}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Birth Day
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {selectedPlayer.data_lindjes}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ekipi
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {selectedPlayer.ekipi_id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {selectedPlayer.pozicioni}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {selectedPlayer.numri}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hight
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {selectedPlayer.gjatesia}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weight
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {selectedPlayer.pesha}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nationality
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
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
              className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-6">
                <div className="border-2 border-gray-200 rounded-xl p-4 flex flex-col">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Player Profile Image</p>
                  <div className="h-[340px] border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden">
                    {currentFotoPreview ? (
                      <img
                        src={currentFotoPreview}
                        alt="Player profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <p className="text-center text-gray-500 font-medium px-4">PLAYER PROFILE IMAGE HERE</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Player Profile
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFotoUpload}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    {uploading && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
                  </div>
                </div>
                <div>
                  <h3 className="text-2x1 font-bold text-gray-800 mb-6">Edit Player</h3>
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First name input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="emri"
                      value={formData.emri}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border borde-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="First Name"
                      required
                    />
                  </div>
                  {/* Last name input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="mbiemri"
                      value={formData.mbiemri}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Last Name"
                      required
                    />
                  </div>

                  {/* Date of Birth input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      name="data_lindjes"
                      value={formData.data_lindjes}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="****-**-**"
                      required
                    />
                  </div>
                  {/* Team input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sport Filter
                    </label>
                    <select
                      value={selectedSportId}
                      onChange={(e) => {
                        setSelectedSportId(e.target.value);
                        setFormData((prev) => ({ ...prev, ekipi_id: "" }));
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team
                    </label>
                    <select
                      name="ekipi_id"
                      value={formData.ekipi_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Position
                    </label>
                    <input
                      type="text"
                      name="pozicioni"
                      value={formData.pozicioni}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Pozition"
                    />
                  </div>
                  {/* Number input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number
                    </label>
                    <input
                      type="text"
                      name="numri"
                      value={formData.numri}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="1,2,3..."
                    />
                  </div>
                  {/* Hight input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hight *
                    </label>
                    <input
                      type="text"
                      name="gjatesia"
                      value={formData.gjatesia}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="150cm..."
                      required
                    />
                  </div>
                  {/* Weight input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weight *
                    </label>
                    <input
                      type="text"
                      name="pesha"
                      value={formData.pesha}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Weight"
                      required
                    />
                  </div>
                  {/* Nationality input field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nationality *
                    </label>
                    <input
                      type="text"
                      name="kombesia"
                      value={formData.kombesia}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-2x1 font-bold text-red-600 mb-4">Delete Player?</h3>

                <p className="text-gray-700 mb-6">
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
