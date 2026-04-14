import { useContext, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../../config/api";
import AuthContext from "../../context/AuthContext";
import { Award, Plus, Search, Pencil, Trash2 } from "lucide-react";

// Format data from ISO String to readable format
const formatDate = (isoDate) => {
  if (!isoDate) return "N/A";
  try {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getDate() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "Invalid date";
  }
};

// State Variables
export default function MatchResults() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasOpenedPreselectedModal = useRef(false);
  const [MatchResults, setMatchResults] = useState([]);
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMatchResult, setSelectedMatchResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    ndeshja_id: "",
    golat_shtepiak: "",
    golat_mysafir: "",
    fitues_id: "",
    shenime: "",
    mvp_id: "",
  });

  // Fetch Match Result data from backend via API
  useEffect(() => {
    const loadMatchResults = async () => {
      if (!user?.is_admin) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [
          matchResultsResponse,
          matchesResponse,
          teamsResponse,
          playersResponse,
        ] = await Promise.all([
          fetch(`${API_BASE_URL}/match-results`, {
            credentials: "include",
          }),
          fetch(`${API_BASE_URL}/matches`, {
            credentials: "include",
          }),
          fetch(`${API_BASE_URL}/teams`, {
            credentials: "include",
          }),
          fetch(`${API_BASE_URL}/players`, {
            credentials: "include",
          }),
        ]);

        if (!matchResultsResponse.ok) {
          throw new Error("Failed to fetch Match Results");
        }
        if (!matchesResponse.ok) {
          throw new Error("Failed to fetch matches");
        }
        if (!teamsResponse.ok) {
          throw new Error("Failed to fetch teams");
        }
        if (!playersResponse.ok) {
          throw new Error("Failed to fetch players");
        }

        const MatchResultData = await matchResultsResponse.json();
        const matchesData = await matchesResponse.json();
        const teamsData = await teamsResponse.json();
        const playersData = await playersResponse.json();

        setMatchResults(MatchResultData);
        setMatches(matchesData);
        setTeams(teamsData);
        setPlayers(playersData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadMatchResults();
  }, [user]);

  // Create match result handlers
  const handleCreate = () => {
    const firstEligibleMatchId = eligibleMatches[0]?.id
      ? String(eligibleMatches[0].id)
      : "";
    setFormData({
      ndeshja_id: firstEligibleMatchId,
      golat_shtepiak: "",
      golat_mysafir: "",
      fitues_id: "",
      shenime: "",
      mvp_id: "",
    });
    setShowModal(true);
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "ndeshja_id") {
      setFormData((prev) => ({
        ...prev,
        ndeshja_id: value,
        fitues_id: "",
        mvp_id: "",
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const buildMatchResultPayload = () => ({
    ndeshja_id: Number(formData.ndeshja_id),
    golat_shtepiak: Number(formData.golat_shtepiak || 0),
    golat_mysafir: Number(formData.golat_mysafir || 0),
    fitues_id: formData.fitues_id ? Number(formData.fitues_id) : null,
    shenime: formData.shenime?.trim() || null,
    mvp_id: formData.mvp_id ? Number(formData.mvp_id) : null,
  });

  // Handle form submission (Create)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/match-results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(buildMatchResultPayload()),
      });
      if (!response.ok) throw new Error("Failed to create Match");

      const newMatch = await response.json();

      setMatchResults([...MatchResults, newMatch]);

      setFormData({
        ndeshja_id: "",
        golat_shtepiak: "",
        golat_mysafir: "",
        fitues_id: "",
        shenime: "",
        mvp_id: "",
      });

      setShowModal(false);
    } catch (err) {
      alert("Error creating match: " + err.message);
    }
  };

  // Modal close handlers
  const handleCloseModal = () => {
    setFormData({
      ndeshja_id: "",
      golat_shtepiak: "",
      golat_mysafir: "",
      fitues_id: "",
      shenime: "",
      mvp_id: "",
    });
    setShowModal(false);
  };

  const handleCloseEditModal = () => {
    setFormData({
      ndeshja_id: "",
      golat_shtepiak: "",
      golat_mysafir: "",
      fitues_id: "",
      shenime: "",
      mvp_id: "",
    });
    setSelectedMatchResult(null);
    setShowEditModal(false);
  };

  const handleCloseDeleteModal = () => {
    setSelectedMatchResult(null);
    setShowDeleteModal(false);
  };

  // Button handlers
  const handleEdit = (id) => {
    const matchResult = MatchResults.find((e) => e.id === id);
    setSelectedMatchResult(matchResult);

    setFormData({
      ndeshja_id: String(matchResult.ndeshja_id),
      golat_shtepiak: String(matchResult.golat_shtepiak),
      golat_mysafir: String(matchResult.golat_mysafir),
      fitues_id: matchResult.fitues_id ? String(matchResult.fitues_id) : "",
      shenime: matchResult.shenime || "",
      mvp_id: matchResult.mvp_id ? String(matchResult.mvp_id) : "",
    });
    setShowEditModal(true);
  };

  const handleDelete = (id) => {
    const matchResult = MatchResults.find((e) => e.id === id);
    setSelectedMatchResult(matchResult);
    setShowDeleteModal(true);
  };

  // API handlers
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMatchResult) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/match-results/${selectedMatchResult.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(buildMatchResultPayload()),
        },
      );
      if (!response.ok) throw new Error("Failed to update match");

      const updatedMatch = await response.json();

      setMatchResults(
        MatchResults.map((e) => (e.id === updatedMatch.id ? updatedMatch : e)),
      );

      setFormData({
        ndeshja_id: "",
        golat_shtepiak: "",
        golat_mysafir: "",
        fitues_id: "",
        shenime: "",
        mvp_id: "",
      });

      setShowEditModal(false);
      setSelectedMatchResult(null);
    } catch (err) {
      alert("Error updating match: " + err.message);
    }
  };

  // Confrim delete
  const handleDeleteConfirm = async () => {
    if (!selectedMatchResult) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/match-results/${selectedMatchResult.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) throw new Error("Failed to delete match");

      setMatchResults(
        MatchResults.filter((e) => e.id !== selectedMatchResult.id),
      );

      setSelectedMatchResult(null);
      setShowDeleteModal(false);
    } catch (err) {
      alert("Error deleting match: " + err.message);
    }
  };

  const getTeamNameById = (teamId) => {
    const team = teams.find((item) => String(item.id) === String(teamId));
    return team?.emertimi || `Ekipi #${teamId}`;
  };

  const existingResultMatchIds = new Set(
    MatchResults.map((item) => Number(item.ndeshja_id)),
  );

  const eligibleMatches = matches.filter(
    (match) =>
      match.statusi === "Përfunduar" &&
      !existingResultMatchIds.has(Number(match.id)),
  );

  const selectedMatchForForm = matches.find(
    (match) => String(match.id) === String(formData.ndeshja_id),
  );

  const winnerTeamOptions = selectedMatchForForm
    ? [
        {
          id: selectedMatchForForm.ekipi_shtepiak_id,
          name: getTeamNameById(selectedMatchForForm.ekipi_shtepiak_id),
        },
        {
          id: selectedMatchForForm.ekipi_mysafir_id,
          name: getTeamNameById(selectedMatchForForm.ekipi_mysafir_id),
        },
      ]
    : [];

  const preselectedMatchId = searchParams.get("matchId");

  useEffect(() => {
    if (!preselectedMatchId) return;
    if (loading || matches.length === 0) return;
    if (hasOpenedPreselectedModal.current) return;

    const targetMatch = eligibleMatches.find(
      (match) => String(match.id) === String(preselectedMatchId),
    );

    if (targetMatch) {
      hasOpenedPreselectedModal.current = true;
      setFormData({
        ndeshja_id: String(targetMatch.id),
        golat_shtepiak: "",
        golat_mysafir: "",
        fitues_id: "",
        shenime: "",
        mvp_id: "",
      });
      setShowModal(true);
      navigate("/match-results", { replace: true });
    }

    if (!targetMatch) {
      hasOpenedPreselectedModal.current = true;
      navigate("/match-results", { replace: true });
    }
  }, [preselectedMatchId, eligibleMatches, loading, matches.length, navigate]);

  // Conditional rendering based on auth
  if (!user || (!user.is_admin && user.roli !== "admin")) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="flex flex-col flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-40 bg-gray-100 rounded-xl animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  const filteredMatches = MatchResults.filter(
    (match) =>
      (match.ekipi_shtepiak &&
        match.ekipi_shtepiak
          .toLowerCase()
          .includes(searchQuery.toLowerCase())) ||
      (match.ekipi_mysafir &&
        match.ekipi_mysafir
          .toLowerCase()
          .includes(searchQuery.toLowerCase())) ||
      (match.turneu_emri &&
        match.turneu_emri.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="flex flex-col flex-1 p-8 bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Rezultatet e Ndeshjeve
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Menaxhoni rezultatet, shenimet dhe lojtaret MVP
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Shto Rezultat</span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-6 relative max-w-md">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Kërko me emër ekipi ose turneu..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* Match Cards Grid */}
      {filteredMatches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-500">Nuk u gjet asnje rezultat ndeshjeje.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
          {filteredMatches.map((match) => (
            <div
              key={match.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col hover:shadow-md transition-shadow"
            >
              {/* Card Header: Tournament & Date */}
              <div className="flex justify-between items-center text-xs text-gray-500 mb-4 border-b border-gray-100 pb-3">
                <span className="font-semibold text-indigo-600 truncate mr-2">
                  {match.turneu_emri || "Turne i Panjohur"}
                </span>
                <span className="whitespace-nowrap">
                  {formatDate(match.data_ndeshjes)}
                </span>
              </div>

              {/* Scoreboard Area */}
              <div className="flex justify-between items-center my-4">
                <div className="flex-1 text-center font-medium text-gray-800 break-words leading-tight">
                  {match.ekipi_shtepiak}
                </div>
                <div className="px-4 text-2xl font-black text-gray-900 bg-gray-50 border border-gray-100 rounded-lg mx-3 py-1.5 min-w-[80px] text-center shadow-inner">
                  {match.golat_shtepiak} - {match.golat_mysafir}
                </div>
                <div className="flex-1 text-center font-medium text-gray-800 break-words leading-tight">
                  {match.ekipi_mysafir}
                </div>
              </div>

              {/* Notes */}
              {match.shenime && (
                <div className="text-xs text-gray-500 text-center italic mb-4 line-clamp-1 border-b border-gray-50 pb-3">
                  "{match.shenime}"
                </div>
              )}

              {/* Card Footer: MVP & Actions */}
              <div
                className={
                  "mt-auto pt-3 flex items-center justify-between border-t border-gray-50 " +
                  (!match.shenime ? "border-t-0 pt-0" : "")
                }
              >
                <div className="text-sm text-gray-600 flex items-center">
                  <Award className="w-4 h-4 mr-1.5 text-amber-500" />
                  MVP:{" "}
                  <span className="font-medium ml-1 text-gray-900 truncate max-w-[120px]">
                    {match.mvp_emr_mbiemr || "N/A"}
                  </span>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleEdit(match.id)}
                    className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(match.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
            <h3 className="text-2x1 font-bold text-gray-800 mb-6">
              Watch Match Results
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ndeshja ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pick Match *
                  </label>
                  <select
                    name="ndeshja_id"
                    value={formData.ndeshja_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Pick finished match</option>
                    {eligibleMatches.map((match) => (
                      <option key={match.id} value={match.id}>
                        {getTeamNameById(match.ekipi_shtepiak_id)} vs{" "}
                        {getTeamNameById(match.ekipi_mysafir_id)} -{" "}
                        {formatDate(match.data_ndeshjes)}
                      </option>
                    ))}
                  </select>
                  {eligibleMatches.length === 0 && (
                    <p className="text-xs text-amber-600 mt-2">
                      No finished matches available.
                    </p>
                  )}
                </div>
                {/* Golat shtepiak */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Home Goals *
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="golat_shtepiak"
                    value={formData.golat_shtepiak}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Golat shtepiak"
                    required
                  />
                </div>

                {/* Golat vizitor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Away Goals *
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="golat_mysafir"
                    value={formData.golat_mysafir}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Golat mysafir"
                    required
                  />
                </div>
                {/* Fituesi id */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Winner
                  </label>
                  <select
                    name="fitues_id"
                    value={formData.fitues_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={!selectedMatchForForm}
                  >
                    <option value="">No Team</option>
                    {winnerTeamOptions.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Shenime */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <input
                    type="text"
                    name="shenime"
                    value={formData.shenime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Notes"
                  />
                </div>
                {/* MVP */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    MVP
                  </label>
                  <select
                    type="text"
                    name="mvp_id"
                    value={formData.mvp_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="MVP Player"
                  >
                    <option value="">Select MVP</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.emri} {player.mbiemri}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Form buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={eligibleMatches.length === 0}
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

        {/* EDIT RESULT MODAL */}
        {showEditModal && selectedMatchResult && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseEditModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2x1 font-bold text-gray-800 mb-6">
                Edito Rezultatin
              </h3>
              <form onSubmit={handleEditSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Match *
                    </label>
                    <select
                      name="ndeshja_id"
                      value={formData.ndeshja_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select match</option>
                      {matches
                        .filter(
                          (m) =>
                            m.statusi === "Përfunduar" ||
                            String(m.id) === String(formData.ndeshja_id),
                        )
                        .map((match) => (
                          <option key={match.id} value={match.id}>
                            {getTeamNameById(match.ekipi_shtepiak_id)} vs {" "}
                            {getTeamNameById(match.ekipi_mysafir_id)} - {" "}
                            {formatDate(match.data_ndeshjes)}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Goals Home *
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="golat_shtepiak"
                      value={formData.golat_shtepiak}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Goals Away *
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="golat_mysafir"
                      value={formData.golat_mysafir}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Winner
                    </label>
                    <select
                      name="fitues_id"
                      value={formData.fitues_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      disabled={!selectedMatchForForm}
                    >
                      <option value="">No Team</option>
                      {winnerTeamOptions.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <input
                      type="text"
                      name="shenime"
                      value={formData.shenime}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      MVP
                    </label>
                    <select
                      name="mvp_id"
                      value={formData.mvp_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select MVP</option>
                      {players.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.emri} {player.mbiemri}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 rounded-lg transition duration-200"
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

        {/* DELETE RESULT MODAL */}
        {showDeleteModal && selectedMatchResult && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseDeleteModal}
          >
            <div
              className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-red-600 mb-4">
                Delete result?
              </h3>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete this result?
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
  );
}
