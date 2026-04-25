import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";

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

export default function Standings() {
  // Uses auth context to protect standings management routes.
  const { user } = useContext(AuthContext);

  // Holds standings data, filters, modal state, and active form fields.
  const [standings, setStandings] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStanding, setSelectedStanding] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTournament, setFilterTournament] = useState("");
  const [alert, setAlert] = useState(null);
  const [formData, setFormData] = useState({
    turneu_id: "",
    ekipi_id: "",
    ndeshjet_luajtura: "",
    fitoret: "",
    barazimet: "",
    humbjet: "",
    golat_shenuar: "",
    golat_pranuar: "",
    piket: "",
  });

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!user?.is_admin) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [standingsResponse, tournamentsResponse, teamsResponse] =
          await Promise.all([
            api.get(`/standings`),
            api.get(`/tournaments`),
            api.get(`teams`)
          ]);

        const standingsData = standingsResponse.data;
        const tournamentsData =  tournamentsResponse.data;
        const teamsData = teamsResponse.data;

        setStandings(Array.isArray(standingsData) ? standingsData : []);
        setTournaments(Array.isArray(tournamentsData) ? tournamentsData : []);
        setTeams(Array.isArray(teamsData) ? teamsData : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const getTournamentName = (tournamentId) => {
    // Resolves tournament label for table rendering from cached list.
    const tournament = tournaments.find((t) => t.id === tournamentId);
    return tournament?.emertimi || "Unknown Tournament";
  };

  const getTeamName = (teamId) => {
    // Resolves team label for table rendering from cached list.
    const team = teams.find((t) => t.id === teamId);
    return team?.emertimi || "Unknown Team";
  };

  const handleCreate = () => {
    setFormData({
      turneu_id: "",
      ekipi_id: "",
      ndeshjet_luajtura: "",
      fitoret: "",
      barazimet: "",
      humbjet: "",
      golat_shenuar: "",
      golat_pranuar: "",
      piket: "",
    });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate required fields
      if (!formData.turneu_id || !formData.ekipi_id) {
        setAlert({
          type: "error",
          message: "Tournament and Team are required!",
        });
        return;
      }

      const payload = {
        turneu_id: parseInt(formData.turneu_id),
        ekipi_id: parseInt(formData.ekipi_id),
        ndeshjet_luajtura: parseInt(formData.ndeshjet_luajtura) || 0,
        fitoret: parseInt(formData.fitoret) || 0,
        barazimet: parseInt(formData.barazimet) || 0,
        humbjet: parseInt(formData.humbjet) || 0,
        golat_shenuar: parseInt(formData.golat_shenuar) || 0,
        golat_pranuar: parseInt(formData.golat_pranuar) || 0,
        piket: parseInt(formData.piket) || 0,
      };

      const response = await api.post(`/standings`, payload())

      const newStanding = response.data;
      setStandings([...standings, newStanding]);
      setFormData({
        turneu_id: "",
        ekipi_id: "",
        ndeshjet_luajtura: "",
        fitoret: "",
        barazimet: "",
        humbjet: "",
        golat_shenuar: "",
        golat_pranuar: "",
        piket: "",
      });
      setShowModal(false);
      setAlert({ type: "success", message: "Standing created successfully!" });
    } catch (err) {
      setAlert({
        type: "error",
        message: "Error creating standing: " + err.message,
      });
    }
  };

  const handleCloseModal = () => {
    setFormData({
      turneu_id: "",
      ekipi_id: "",
      ndeshjet_luajtura: "",
      fitoret: "",
      barazimet: "",
      humbjet: "",
      golat_shenuar: "",
      golat_pranuar: "",
      piket: "",
    });
    setShowModal(false);
  };

  const handleView = (id) => {
    const standing = standings.find((s) => s.id === id);
    setSelectedStanding(standing);
    setShowViewModal(true);
  };

  const handleEdit = (id) => {
    const standing = standings.find((s) => s.id === id);
    setSelectedStanding(standing);
    setFormData({
      turneu_id: standing.turneu_id || "",
      ekipi_id: standing.ekipi_id || "",
      ndeshjet_luajtura: standing.ndeshjet_luajtura || "",
      fitoret: standing.fitoret || "",
      barazimet: standing.barazimet || "",
      humbjet: standing.humbjet || "",
      golat_shenuar: standing.golat_shenuar || "",
      golat_pranuar: standing.golat_pranuar || "",
      piket: standing.piket || "",
    });
    setShowEditModal(true);
  };

  const handleDelete = (id) => {
    const standing = standings.find((s) => s.id === id);
    setSelectedStanding(standing);
    setShowDeleteModal(true);
  };

  const handleCloseViewModal = () => {
    setSelectedStanding(null);
    setShowViewModal(false);
  };

  const handleCloseEditModal = () => {
    setFormData({
      turneu_id: "",
      ekipi_id: "",
      ndeshjet_luajtura: "",
      fitoret: "",
      barazimet: "",
      humbjet: "",
      golat_shenuar: "",
      golat_pranuar: "",
      piket: "",
    });
    setSelectedStanding(null);
    setShowEditModal(false);
  };

  const handleCloseDeleteModal = () => {
    setSelectedStanding(null);
    setShowDeleteModal(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStanding) return;
    try {
      if (!formData.turneu_id || !formData.ekipi_id) {
        setAlert({
          type: "error",
          message: "Tournament and Team are required!",
        });
        return;
      }

      const payload = {
        turneu_id: parseInt(formData.turneu_id),
        ekipi_id: parseInt(formData.ekipi_id),
        ndeshjet_luajtura: parseInt(formData.ndeshjet_luajtura) || 0,
        fitoret: parseInt(formData.fitoret) || 0,
        barazimet: parseInt(formData.barazimet) || 0,
        humbjet: parseInt(formData.humbjet) || 0,
        golat_shenuar: parseInt(formData.golat_shenuar) || 0,
        golat_pranuar: parseInt(formData.golat_pranuar) || 0,
        piket: parseInt(formData.piket) || 0,
      };

      const response = await api.put(`/standings/${selectedStanding.id}`, payload())

      const updatedStanding = response.data;
      setStandings(
        standings.map((s) =>
          s.id === updatedStanding.id ? updatedStanding : s,
        ),
      );
      setFormData({
        turneu_id: "",
        ekipi_id: "",
        ndeshjet_luajtura: "",
        fitoret: "",
        barazimet: "",
        humbjet: "",
        golat_shenuar: "",
        golat_pranuar: "",
        piket: "",
      });
      setSelectedStanding(null);
      setShowEditModal(false);
      setAlert({ type: "success", message: "Standing updated successfully!" });
    } catch (err) {
      setAlert({
        type: "error",
        message: "Error updating standing: " + err.message,
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedStanding) return;
    try {
      await api.delete(`/standings/${selectedStanding.id}`)

      setStandings(standings.filter((s) => s.id !== selectedStanding.id));
      setSelectedStanding(null);
      setShowDeleteModal(false);
      setAlert({ type: "success", message: "Standing deleted successfully!" });
    } catch (err) {
      setAlert({
        type: "error",
        message: "Error deleting standing: " + err.message,
      });
    }
  };

  if (!user || !user.is_admin) {
    return <Navigate to="/login" replace />;
  }

  function renderSkeleton() {
    return (
      <div className="bg-gray-50 p-4">
        <div className="w-full mx-auto animate-pulse">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <div className="h-8 bg-gray-300 rounded w-64"></div>
              <div className="h-10 bg-gray-300 rounded w-32"></div>
            </div>
            <div className="h-12 bg-gray-300 rounded-lg w-full"></div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  {[...Array(10)].map((_, i) => (
                    <th key={i} className="px-4 py-3">
                      <div className="h-4 bg-gray-600 rounded w-20"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...Array(5)].map((_, index) => (
                  <tr key={index} className="bg-white">
                    {[...Array(10)].map((_, i) => (
                      <td key={i} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
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

  if (loading) return renderSkeleton();

  if (error)
    return (
      <div className="flex justify-center items-center h-center">
        <p className="text-lg text-red-600">Error: {error}</p>
      </div>
    );

  // Filter standings based on search and tournament filter
  // Filters standings by tournament/team names and selected tournament id.
  const filteredStandings = standings.filter((standing) => {
    const matchesTournament =
      !filterTournament || standing.turneu_id === parseInt(filterTournament);
    const matchesSearch =
      getTeamName(standing.ekipi_id)
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      getTournamentName(standing.turneu_id)
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    return matchesTournament && matchesSearch;
  });

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
              Tournament Standings Management
            </h2>
            <button
              onClick={handleCreate}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-200 ease-in-out"
            >
              + Add Standing
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="relative">
              <input
                type="text"
                name="search"
                placeholder="Search by team or tournament"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <select
              value={filterTournament}
              onChange={(e) => setFilterTournament(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Tournaments</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.emertimi}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="flex bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">ID</th>
                <th className="px-4 py-3 text-left font-semibold">
                  Tournament
                </th>
                <th className="px-4 py-3 text-left font-semibold">Team</th>
                <th className="px-4 py-3 text-center font-semibold">Matches</th>
                <th className="px-4 py-3 text-center font-semibold">Wins</th>
                <th className="px-4 py-3 text-center font-semibold">Draws</th>
                <th className="px-4 py-3 text-center font-semibold">Losses</th>
                <th className="px-4 py-3 text-center font-semibold">
                  Goals For
                </th>
                <th className="px-4 py-3 text-center font-semibold">
                  Goals Against
                </th>
                <th className="px-4 py-3 text-center font-semibold">Points</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStandings.length > 0 ? (
                filteredStandings.map((standing) => (
                  <tr
                    key={standing.id}
                    className="hover:bg-gray-100 transition-colors duration-150"
                  >
                    <td className="px-4 py-3 text-gray-500">
                      {standing.id}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-semibold">
                      {getTournamentName(standing.turneu_id)}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-semibold">
                      {getTeamName(standing.ekipi_id)}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-semibold text-center">
                      {standing.ndeshjet_luajtura}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-semibold text-center">
                      {standing.fitoret}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-semibold text-center">
                      {standing.barazimet}
                    </td>
                    <td className="px-4 py-3 text-gray-800 text-center">
                      {standing.humbjet}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-semibold text-center">
                      {standing.golat_shenuar}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-semibold text-center">
                      {standing.golat_pranuar}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-bold text-center bg-blue-50">
                      {standing.piket}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleView(standing.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(standing.id)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(standing.id)}
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
                    colSpan="11"
                    className="px-6 py-4 text-center text-gray-600"
                  >
                    {searchQuery || filterTournament
                      ? "No standings match your search criteria."
                      : 'No standings found. Click "Add Standing" to add a new one.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ADD STANDING MODAL */}
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
                Add New Standing
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
                      {tournaments.map((tournament) => (
                        <option key={tournament.id} value={tournament.id}>
                          {tournament.emertimi}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team *
                    </label>
                    <select
                      name="ekipi_id"
                      value={formData.ekipi_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select Team</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.emertimi}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Matches Played
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="ndeshjet_luajtura"
                      value={formData.ndeshjet_luajtura}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Wins
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="fitoret"
                      value={formData.fitoret}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Draws
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="barazimet"
                      value={formData.barazimet}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Losses
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="humbjet"
                      value={formData.humbjet}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Goals Scored
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="golat_shenuar"
                      value={formData.golat_shenuar}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Goals Conceded
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="golat_pranuar"
                      value={formData.golat_pranuar}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Points
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="piket"
                      value={formData.piket}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
        )}

        {/* VIEW STANDING MODAL */}
        {showViewModal && selectedStanding && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseViewModal}
          >
            <div
              className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">
                Standing Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Tournament
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {getTournamentName(selectedStanding.turneu_id)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Team</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {getTeamName(selectedStanding.ekipi_id)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Matches Played
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedStanding.ndeshjet_luajtura}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Wins</p>
                  <p className="text-lg font-semibold text-green-600">
                    {selectedStanding.fitoret}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Draws</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedStanding.barazimet}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Losses</p>
                  <p className="text-lg font-semibold text-red-600">
                    {selectedStanding.humbjet}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Goals Scored
                  </p>
                  <p className="text-lg font-semibold text-blue-600">
                    {selectedStanding.golat_shenuar}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Goals Conceded
                  </p>
                  <p className="text-lg font-semibold text-orange-600">
                    {selectedStanding.golat_pranuar}
                  </p>
                </div>
                <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-600">
                    Total Points
                  </p>
                  <p className="text-3xl font-bold text-blue-600">
                    {selectedStanding.piket}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseViewModal}
                className="mt-6 w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg transition duration-200"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* EDIT STANDING MODAL */}
        {showEditModal && selectedStanding && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseEditModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">
                Edit Standing
              </h3>
              <form onSubmit={handleEditSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tournament *
                    </label>
                    <select
                      name="turneu_id"
                      value={formData.turneu_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      required
                    >
                      <option value="">Select Tournament</option>
                      {tournaments.map((tournament) => (
                        <option key={tournament.id} value={tournament.id}>
                          {tournament.emertimi}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team *
                    </label>
                    <select
                      name="ekipi_id"
                      value={formData.ekipi_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      required
                    >
                      <option value="">Select Team</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.emertimi}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Matches Played
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="ndeshjet_luajtura"
                      value={formData.ndeshjet_luajtura}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Wins
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="fitoret"
                      value={formData.fitoret}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Draws
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="barazimet"
                      value={formData.barazimet}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Losses
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="humbjet"
                      value={formData.humbjet}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Goals Scored
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="golat_shenuar"
                      value={formData.golat_shenuar}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Goals Conceded
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="golat_pranuar"
                      value={formData.golat_pranuar}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Points
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="piket"
                      value={formData.piket}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                </div>

                {/* Form buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 rounded-lg transition duration-200"
                  >
                    Update
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

        {/* DELETE STANDING MODAL */}
        {showDeleteModal && selectedStanding && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseDeleteModal}
          >
            <div
              className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Confirm Delete
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the standing for{" "}
                <span className="font-semibold">
                  {getTeamName(selectedStanding.ekipi_id)}
                </span>{" "}
                in{" "}
                <span className="font-semibold">
                  {getTournamentName(selectedStanding.turneu_id)}
                </span>
                ?
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
