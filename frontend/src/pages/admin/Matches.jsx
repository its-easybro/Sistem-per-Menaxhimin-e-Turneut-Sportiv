import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";
import { Pencil, Trash2, Eye } from "lucide-react";

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

export default function Matches() {
  // Central admin page for managing matches and linked tournament/team/venue data.
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // State Variables
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [alert, setAlert] = useState(null);
  const [formData, setFormData] = useState({
    turneu_id: "",
    ekipi_shtepiak_id: "",
    ekipi_mysafir_id: "",
    data_ndeshjes: "",
    ora_fillimit: "",
    fusha_id: "",
    statusi: "Planifikuar",
    faza: "",
  });

  // Loads matches plus lookup datasets in one batch for form dropdowns.
  useEffect(() => {
    const loadData = async () => {
      if (!user?.is_admin) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError("");
        const [
          matchesResponse,
          tournamentsResponse,
          teamsResponse,
          registrationsResponse,
          venuesResponse,
        ] = await Promise.all([
          api.get(`/matches`),
          api.get(`tournaments`),
          api.get(`teams`),
          api.get(`/tournament-registrations`),
          api.get(`/venues`)
        ]);

        const matchesData = matchesResponse.data;
        const tournamentsData = tournamentsResponse.data;
        const teamsData =  teamsResponse.data;
        const registrationsData = registrationsResponse.data;
        const venuesData = venuesResponse.data;
        setTournaments(Array.isArray(tournamentsData) ? tournamentsData : []);
        setMatches(Array.isArray(matchesData) ? matchesData : []);
        setTeams(Array.isArray(teamsData) ? teamsData : []);
        setRegistrations(Array.isArray(registrationsData) ? registrationsData : []);
        setVenues(Array.isArray(venuesData) ? venuesData : []);
      } catch (err) {
        console.error("Error loading data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  // Create match handler
  const handleCreate = () => {
    setFormData({
      turneu_id: "",
      ekipi_shtepiak_id: "",
      ekipi_mysafir_id: "",
      data_ndeshjes: "",
      ora_fillimit: "",
      fusha_id: "",
      statusi: "Planifikuar",
      faza: "",
    });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: value,
      };

      if (name === "turneu_id") {
        next.ekipi_shtepiak_id = "";
        next.ekipi_mysafir_id = "";
      }

      return next;
    });
  };

  // Handle form submission (Create)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (
        !formData.turneu_id ||
        !formData.ekipi_shtepiak_id ||
        !formData.ekipi_mysafir_id ||
        !formData.data_ndeshjes
      ) {
        alert("Please fill in all required fields");
        return;
      }

      // Convert IDs to integers
      const dataToSend = {
        ...formData,
        turneu_id: parseInt(formData.turneu_id),
        ekipi_shtepiak_id: parseInt(formData.ekipi_shtepiak_id),
        ekipi_mysafir_id: parseInt(formData.ekipi_mysafir_id),
        fusha_id: formData.fusha_id ? parseInt(formData.fusha_id) : null,
      };

      const response = await api.post(`/matches`, dataToSend)

      const newMatch = response.data;
      setMatches([...matches, newMatch]);
      setShowModal(false);
      setFormData({
        turneu_id: "",
        ekipi_shtepiak_id: "",
        ekipi_mysafir_id: "",
        data_ndeshjes: "",
        ora_fillimit: "",
        fusha_id: "",
        statusi: "Planifikuar",
        faza: "",
      });
      setAlert({ type: "success", message: "Match created successfully!" });
    } catch (err) {
      console.error("Error creating match:", err);
      setAlert({ type: "error", message: "Error creating match: " + err.message });
    }
  };

  // Modal close handlers
  const handleCloseModal = () => {
    setFormData({
      turneu_id: "",
      ekipi_shtepiak_id: "",
      ekipi_mysafir_id: "",
      data_ndeshjes: "",
      ora_fillimit: "",
      fusha_id: "",
      statusi: "Planifikuar",
      faza: "",
    });
    setShowModal(false);
  };

  const handleCloseEditModal = () => {
    setFormData({
      turneu_id: "",
      ekipi_shtepiak_id: "",
      ekipi_mysafir_id: "",
      data_ndeshjes: "",
      ora_fillimit: "",
      fusha_id: "",
      statusi: "Planifikuar",
      faza: "",
    });
    setSelectedMatch(null);
    setShowEditModal(false);
  };

  const handleCloseViewModal = () => {
    setSelectedMatch(null);
    setShowViewModal(false);
  };

  const handleCloseDeleteModal = () => {
    setSelectedMatch(null);
    setShowDeleteModal(false);
  };

  // Button handlers
  const handleView = (id) => {
    const match = matches.find((m) => m.id === id);
    setSelectedMatch(match);
    setShowViewModal(true);
  };

  const handleEdit = (id) => {
    const match = matches.find((m) => m.id === id);
    if (!match) return;
    setSelectedMatch(match);
    setFormData({
      turneu_id: String(match.turneu_id),
      ekipi_shtepiak_id: String(match.ekipi_shtepiak_id),
      ekipi_mysafir_id: String(match.ekipi_mysafir_id),
      data_ndeshjes: match.data_ndeshjes || "",
      ora_fillimit: match.ora_fillimit || "",
      fusha_id: match.fusha_id ? String(match.fusha_id) : "",
      statusi: match.statusi || "Planifikuar",
      faza: match.faza || "",
    });
    setShowEditModal(true);
  };

  const handleDelete = (id) => {
    const match = matches.find((m) => m.id === id);
    setSelectedMatch(match);
    setShowDeleteModal(true);
  };

  const handleAddResult = (matchId) => {
    // Opens match results page prefilled for the selected match.
    navigate(`/match-results?matchId=${matchId}`);
  };

  // API handlers
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMatch) return;

    try {
      if (
        !formData.turneu_id ||
        !formData.ekipi_shtepiak_id ||
        !formData.ekipi_mysafir_id ||
        !formData.data_ndeshjes
      ) {
        alert("Please fill in all required fields");
        return;
      }

      // Convert IDs to integers
      const dataToSend = {
        ...formData,
        turneu_id: parseInt(formData.turneu_id),
        ekipi_shtepiak_id: parseInt(formData.ekipi_shtepiak_id),
        ekipi_mysafir_id: parseInt(formData.ekipi_mysafir_id),
        fusha_id: formData.fusha_id ? parseInt(formData.fusha_id) : null,
      };

      const response = await api.put(`/matches/${selectedMatch.id}`, dataToSend)
      const updatedMatch = response.data;
      setMatches(
        matches.map((m) => (m.id === updatedMatch.id ? updatedMatch : m)),
      );
      setShowEditModal(false);
      setSelectedMatch(null);
      setAlert({ type: "success", message: "Match updated successfully!" });
    } catch (err) {
      console.error("Error updating match:", err);
      setAlert({ type: "error", message: "Error updating match: " + err.message });
    }
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!selectedMatch) return;

    try {
      await api.delete(`/matches/${selectedMatch.id}`);

      setMatches(matches.filter((m) => m.id !== selectedMatch.id));
      setSelectedMatch(null);
      setShowDeleteModal(false);
      setAlert({ type: "success", message: "Match deleted successfully!" });
    } catch (err) {
      console.error("Error deleting match:", err);
      setAlert({ type: "error", message: "Error deleting match: " + err.message });
    }
  };

  // Helper functions
  const getTournamentName = (id) => {
    const tournament = tournaments.find((t) => t.id === id);
    return tournament?.emertimi || "N/A";
  };

  const getTeamName = (id) => {
    const team = teams.find((t) => t.id === id);
    return team?.emertimi || "N/A";
  };

  const getVenueName = (id) => {
    const venue = venues.find((v) => v.id === id);
    return venue?.emertimi || "N/A";
  };

  const availableTeams = teams.filter((team) => {
    if (!formData.turneu_id) return false;

    return registrations.some(
      (registration) =>
        String(registration.turneu_id) === String(formData.turneu_id) &&
        registration.ekipi_id === team.id &&
        registration.statusi === "Aprovuar",
    );
  });

  // Skeleton loading
  function renderSkeleton() {
    return (
      <div className="bg-gray-50 p-4">
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
                  {[...Array(8)].map((_, i) => (
                    <th key={i} className="px-4 py-3">
                      <div className="h-4 bg-gray-600 rounded w-20"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...Array(5)].map((_, idx) => (
                  <tr key={idx} className="bg-white">
                    {[...Array(8)].map((_, i) => (
                      <td key={i} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Renders skeleton placeholders while initial API requests are in flight.
  if (loading) return renderSkeleton();

  // Redirects any non-admin user away from this protected page.
  if (!user || !user.is_admin) {
    return <Navigate to="/login" replace />;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg text-red-600">Error: {error}</p>
      </div>
    );
  }

  // Filter matches based on search
  const filteredMatches = matches.filter(
    (match) =>
      getTournamentName(match.turneu_id)
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      getTeamName(match.ekipi_shtepiak_id)
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      getTeamName(match.ekipi_mysafir_id)
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

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
              Match Management
            </h2>
            <button
              onClick={handleCreate}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-200 ease-in-out"
            >
              + Add New Match
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="relative">
            <input  
              type="text"
              name="search"
              placeholder="Search by tournament or team"
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

        {/* Matches table section */}
        <div className="flex bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-3 text-center font-semibold">ID</th>
                <th className="px-4 py-3 text-left font-semibold">
                  Tournament
                </th>
                <th className="px-4 py-3 text-left font-semibold">Home Team</th>
                <th className="px-4 py-3 text-left font-semibold">Away Team</th>
                <th className="px-4 py-3 text-center font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">Time</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            {/* Table Body */}
            <tbody className="divide-y divide-gray-200">
              {filteredMatches.length > 0 ? (
                filteredMatches.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-gray-100 transition-colors duration-150"
                  >
                    <td className="px-4 py-3 text-gray-500 text-center">
                      {m.id}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-semibold">
                      {getTournamentName(m.turneu_id)}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-semibold">
                      {getTeamName(m.ekipi_shtepiak_id)}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-semibold">
                      {getTeamName(m.ekipi_mysafir_id)}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-semibold text-center">
                      {formatDate(m.data_ndeshjes)}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-semibold">
                      {m.ora_fillimit || "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          m.statusi === "Përfunduar"
                            ? "bg-green-100 text-green-800"
                            : m.statusi === "Live"
                              ? "bg-red-100 text-red-800"
                              : m.statusi === "Shtyrë"
                                ? "bg-yellow-100 text-yellow-800"
                                : m.statusi === "Anuluar"
                                  ? "bg-gray-100 text-gray-800"
                                  : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {m.statusi}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleView(m.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded text-sm font-medium transition duration-200"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(m.id)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded text-sm font-medium transition duration-200"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded text-sm font-medium transition duration-200"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => handleAddResult(m.id)}
                          disabled={m.statusi !== "Përfunduar"}
                          className={`p-2 rounded text-sm font-medium transition duration-200 ${
                            m.statusi === "Përfunduar"
                              ? "bg-indigo-500 hover:bg-indigo-600 text-white"
                              : "bg-indigo-200 text-indigo-700 cursor-not-allowed"
                          }`}
                          title={
                            m.statusi === "Përfunduar"
                              ? "Add result"
                              : "Finish the match first"
                          }
                        >
                          {m.statusi === "Përfunduar"
                            ? "Add Result"
                            : "Finish Match First"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="8"
                    className="px-6 py-4 text-center text-gray-600"
                  >
                    {searchQuery
                      ? `No matches match "${searchQuery}". Try a different search.`
                      : 'No matches found. Click "Add New Match" to add a new one.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ADD NEW MATCH MODAL */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">
                Add New Match
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tournament *
                    </label>
                    <select
                      name="turneu_id"
                      value={formData.turneu_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select Tournament</option>
                      {tournaments.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.emertimi}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Home Team *
                    </label>
                    <select
                      name="ekipi_shtepiak_id"
                      value={formData.ekipi_shtepiak_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select Home Team</option>
                      {availableTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.emertimi}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Away Team *
                    </label>
                    <select
                      name="ekipi_mysafir_id"
                      value={formData.ekipi_mysafir_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select Away Team</option>
                      {availableTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.emertimi}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Match Date *
                    </label>
                    <input
                      type="date"
                      name="data_ndeshjes"
                      value={formData.data_ndeshjes}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      name="ora_fillimit"
                      value={formData.ora_fillimit}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Venue
                    </label>
                    <select
                      name="fusha_id"
                      value={formData.fusha_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select Venue</option>
                      {venues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.emertimi}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      name="statusi"
                      value={formData.statusi}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="Planifikuar">Planifikuar</option>
                      <option value="Live">Live</option>
                      <option value="Përfunduar">Përfunduar</option>
                      <option value="Shtyrë">Shtyrë</option>
                      <option value="Anuluar">Anuluar</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phase
                    </label>
                    <input
                      type="text"
                      name="faza"
                      value={formData.faza}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., Final, Semi-final"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg transition duration-200"
                  >
                    Add Match
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

        {/* VIEW MATCH MODAL */}
        {showViewModal && selectedMatch && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseViewModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">
                Match Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tournament
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {getTournamentName(selectedMatch.turneu_id)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Home Team
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {getTeamName(selectedMatch.ekipi_shtepiak_id)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Away Team
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {getTeamName(selectedMatch.ekipi_mysafir_id)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {formatDate(selectedMatch.data_ndeshjes)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {selectedMatch.ora_fillimit || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Venue
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {getVenueName(selectedMatch.fusha_id)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {selectedMatch.statusi}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phase
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {selectedMatch.faza || "N/A"}
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

        {/* EDIT MATCH MODAL */}
        {showEditModal && selectedMatch && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseEditModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">
                Edit Match
              </h3>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tournament *
                    </label>
                    <select
                      name="turneu_id"
                      value={formData.turneu_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select Tournament</option>
                      {tournaments.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.emertimi}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Home Team *
                    </label>
                    <select
                      name="ekipi_shtepiak_id"
                      value={formData.ekipi_shtepiak_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select Home Team</option>
                      {availableTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.emertimi}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Away Team *
                    </label>
                    <select
                      name="ekipi_mysafir_id"
                      value={formData.ekipi_mysafir_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select Away Team</option>
                      {availableTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.emertimi}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Match Date *
                    </label>
                    <input
                      type="date"
                      name="data_ndeshjes"
                      value={formData.data_ndeshjes}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      name="ora_fillimit"
                      value={formData.ora_fillimit}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Venue
                    </label>
                    <select
                      name="fusha_id"
                      value={formData.fusha_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select Venue</option>
                      {venues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.emertimi}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      name="statusi"
                      value={formData.statusi}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="Planifikuar">Planifikuar</option>
                      <option value="Live">Live</option>
                      <option value="Përfunduar">Përfunduar</option>
                      <option value="Shtyrë">Shtyrë</option>
                      <option value="Anuluar">Anuluar</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phase
                    </label>
                    <input
                      type="text"
                      name="faza"
                      value={formData.faza}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., Final, Semi-final"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 rounded-lg transition duration-200"
                  >
                    Save Changes
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

        {/* DELETE MATCH MODAL */}
        {showDeleteModal && selectedMatch && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseDeleteModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-red-600 mb-4">
                Delete Match?
              </h3>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete this match (
                <strong>
                  {getTeamName(selectedMatch.ekipi_shtepiak_id)} vs{" "}
                  {getTeamName(selectedMatch.ekipi_mysafir_id)}
                </strong>
                )? This action cannot be undone.
              </p>

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
