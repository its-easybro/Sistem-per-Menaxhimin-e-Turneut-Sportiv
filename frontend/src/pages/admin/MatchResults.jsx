import { useContext, useEffect, useRef, useState, useCallback } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import * as yup from "yup";
import api from "../../config/axiosInstance";
import AuthContext from "../../context/AuthContext";
import {
  Award,
  Plus,
  Search,
  Edit,
  Trash2,
  Spotlight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Alert } from "../../components/Alert";
import TableSkeleton from "../../components/Skeletons/TableSkeleton";

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

const sportTerms = {
  Futboll: { home: "Home Goals", away: "Away Goals" },
  Basketboll: { home: "Home Points", away: "Away Points" },
  Volejboll: { home: "Home Sets", away: "Away Sets" },
  Futsal: { home: "Home Goals", away: "Away Goals" },
  Hendboll: { home: "Home Goals", away: "Away Goals" },
};

const getTerms = (match) => {
  return (
    sportTerms[match?.sport_emri] || { home: "Home Score", away: "Away Score" }
  );
};

const matchResultCreateSchema = yup.object().shape({
  ndeshja_id: yup.string().required("Match is required"),
  golat_shtepiak: yup
    .number()
    .min(0, "Home score must be 0 or higher")
    .required("Home score is required"),
  golat_mysafir: yup
    .number()
    .min(0, "Away score must be 0 or higher")
    .required("Away score is required"),
  fitues_id: yup.string().nullable(),
  shenime: yup.string(),
  mvp_id: yup.string().nullable(),
});

const matchResultUpdateSchema = yup.object().shape({
  ndeshja_id: yup.string(),
  golat_shtepiak: yup.number().min(0),
  golat_mysafir: yup.number().min(0),
  fitues_id: yup.string().nullable(),
  shenime: yup.string(),
  mvp_id: yup.string().nullable(),
});

const getSportNameForMatch = (match, tournaments, sports) => {
  if (!match) return null;

  if (match.sport_emri) {
    return match.sport_emri;
  }

  const tournament = tournaments.find(
    (item) => String(item.id) === String(match.turneu_id),
  );

  if (!tournament) {
    return null;
  }

  const sport = sports.find(
    (item) => String(item.id) === String(tournament.sporti_id),
  );

  return sport?.emertimi || null;
};

// State Variables
export default function MatchResults() {
  // Handles admin CRUD for match results and related participant metadata.
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Prevents auto-open behavior from running more than once per page load.
  const hasOpenedPreselectedModal = useRef(false);
  const [MatchResults, setMatchResults] = useState([]);
  const [matches, setMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [sports, setSports] = useState([]);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matchReferees, setMatchReferees] = useState([]);
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMatchResult, setSelectedMatchResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [alert, setAlert] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    search: "",
  });
  const [formData, setFormData] = useState({
    ndeshja_id: "",
    golat_shtepiak: "",
    golat_mysafir: "",
    fitues_id: "",
    shenime: "",
    mvp_id: "",
  });
  const [formErrors, setFormErrors] = useState({});

  // Loads match results with pagination and date filters
  const loadMatchResultsPage = useCallback(async (pageNum, filtersObj) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pageNum,
        limit: 10,
        ...(filtersObj.fromDate && { fromDate: filtersObj.fromDate }),
        ...(filtersObj.toDate && { toDate: filtersObj.toDate }),
        ...(filtersObj.search && { search: filtersObj.search }),
      });
      const response = await api.get(`/match-results?${params}`);

      let rows = [];
      let paginationData = null;
      if (Array.isArray(response.data?.data)) {
        rows = response.data.data;
        paginationData = response.data?.pagination ?? null;
      } else if (Array.isArray(response.data)) {
        rows = response.data;
        paginationData = null;
      }

      setPagination(paginationData);
      setMatchResults(rows);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, []);

  // Loads all related entities (matches, tournaments, sports, teams, players, etc.)
  useEffect(() => {
    const loadRelatedEntities = async () => {
      if (!user?.is_admin) {
        setLoading(false);
        return;
      }
      try {
        const [
          matchesResponse,
          tournamentsResponse,
          sportsResponse,
          teamsResponse,
          playersResponse,
          matchRefereesResponse,
          refereesResponse,
        ] = await Promise.all([
          api.get(`/matches`),
          api.get(`/tournaments`),
          api.get(`/sports`),
          api.get(`/teams`),
          api.get(`/players`),
          api.get(`/match-referees`),
          api.get(`/referees`),
        ]);

        const matchesData = matchesResponse.data;
        const tournamentsData = tournamentsResponse.data;
        const sportsData = sportsResponse.data;
        const teamsData = teamsResponse.data;
        const playersData = playersResponse.data;
        const matchRefereesData = matchRefereesResponse.data;
        const refereesData = refereesResponse.data;

        setMatches(matchesData);
        setTournaments(tournamentsData);
        setSports(sportsData);
        setTeams(teamsData);
        setPlayers(playersData);
        setMatchReferees(matchRefereesData);
        setReferees(refereesData);

        // Load first page of match results
        loadMatchResultsPage(1, filters);
      } catch (err) {
        setError(err.message);
      }
    };
    loadRelatedEntities();
  }, [user, loadMatchResultsPage, filters]);

  // Load new page when page number changes
  useEffect(() => {
    if (!user?.is_admin || !hasLoaded) return;
    loadMatchResultsPage(page, filters);
  }, [page, loadMatchResultsPage, filters, user, hasLoaded]);

  // Handle filter changes and pagination
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    setPage(1);
  };

  const handleClearFilters = () => {
    const resetFilters = { fromDate: "", toDate: "", search: "" };
    setFilters(resetFilters);
    setSearchQuery("");
    setPage(1);
    loadMatchResultsPage(1, resetFilters);
  };

  const hasActiveFilters =
    filters.fromDate !== "" || filters.toDate !== "" || filters.search !== "";

  // Implements debounced search like in users.jsx
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) =>
        prev.search === searchQuery ? prev : { ...prev, search: searchQuery },
      );
      if (searchQuery !== filters.search) {
        setPage(1);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, filters.search]);

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
      if (formErrors[name]) {
        setFormErrors((prev) => ({ ...prev, [name]: undefined }));
      }
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
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
      await matchResultCreateSchema.validate(formData, { abortEarly: false });
      await api.post(`/match-results`, buildMatchResultPayload());

      setFormData({
        ndeshja_id: "",
        golat_shtepiak: "",
        golat_mysafir: "",
        fitues_id: "",
        shenime: "",
        mvp_id: "",
      });
      setFormErrors({});

      setShowModal(false);
      setAlert({
        type: "success",
        message: "Match result created successfully!",
      });
      await loadMatchResultsPage(page, filters);
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
          message: "Error creating match result: " + err.message,
        });
      }
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
    setFormErrors({});
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
    setFormErrors({});
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
      await matchResultUpdateSchema.validate(formData, { abortEarly: false });
      await api.put(
        `/match-results/${selectedMatchResult.id}`,
        buildMatchResultPayload(),
      );

      setFormData({
        ndeshja_id: "",
        golat_shtepiak: "",
        golat_mysafir: "",
        fitues_id: "",
        shenime: "",
        mvp_id: "",
      });

      setFormErrors({});
      setShowEditModal(false);
      setSelectedMatchResult(null);
      setAlert({
        type: "success",
        message: "Match result updated successfully!",
      });
      await loadMatchResultsPage(page, filters);
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
          message: "Error updating match result: " + err.message,
        });
      }
    }
  };

  // Confrim delete
  const handleDeleteConfirm = async () => {
    if (!selectedMatchResult) return;
    try {
      await api.delete(`/match-results/${selectedMatchResult.id}`);

      setSelectedMatchResult(null);
      setShowDeleteModal(false);
      setAlert({
        type: "success",
        message: "Match result deleted successfully!",
      });
      await loadMatchResultsPage(page, filters);
    } catch (err) {
      setAlert({
        type: "error",
        message: "Error deleting match result: " + err.message,
      });
    }
  };

  const getTeamNameById = (teamId) => {
    const team = teams.find((item) => String(item.id) === String(teamId));
    return team?.emertimi || `Ekipi #${teamId}`;
  };

  const getMatchReferees = (matchId) => {
    return matchReferees
      .filter((mr) => mr.ndeshja_id === matchId)
      .map((mr) => {
        const referee = referees.find((r) => r.id === mr.gjyqtari_id);
        return {
          name: referee ? `${referee.emri} ${referee.mbiemri}` : "N/A",
          role: mr.roli,
          category: referee?.kategoria || "N/A",
        };
      });
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

  const terms = getTerms({
    sport_emri: getSportNameForMatch(selectedMatchForForm, tournaments, sports),
  });

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

  // Auto-opens create modal when arriving from Matches with ?matchId=<id>.
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

  // Blocks non-admin users from accessing result management.
  if (!user || (!user.is_admin && user.roli !== "admin")) {
    return <Navigate to="/" replace />;
  }

  if (loading && !hasLoaded) {
    return (
      <div className="delay-skeleton">
        <TableSkeleton />
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  // Filters result cards by home team, away team, or tournament name.
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4">
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-6">
          Match Results
        </h2>

        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <div className="hidden lg:block text-xs mb-1" aria-hidden="true">
                <Search
                  size={18}
                  className="text-gray-400 dark:text-gray-500"
                />
              </div>
              <input
                type="text"
                placeholder="Search by team name or tournament..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder-gray-400"
              />
            </div>

            <div className="relative flex-1 min-w-[160px] sm:flex-none">
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                From Date
              </label>
              <input
                type="date"
                name="fromDate"
                value={filters.fromDate}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
            </div>

            <div className="relative flex-1 min-w-[160px] sm:flex-none">
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                To Date
              </label>
              <input
                type="date"
                name="toDate"
                value={filters.toDate}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
            </div>

            <button
              onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 hover:shadow active:scale-[0.98]"
            >
              <Plus size={18} />
              Add Result
            </button>
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

      {/* Match Cards Grid */}
      {filteredMatches.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <p className="text-gray-500 dark:text-slate-400">
            No match results found.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
          {filteredMatches.map((match) => (
            <div
              key={match.id}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 flex flex-col hover:shadow-md transition-shadow"
            >
              {/* Card Header: Tournament & Date */}
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-slate-400 mb-4 border-b border-gray-100 dark:border-slate-800 pb-3">
                <span className="font-semibold text-indigo-600 truncate mr-2">
                  {match.turneu_emri || "Turne i Panjohur"}
                </span>
                <span className="whitespace-nowrap">
                  {formatDate(match.data_ndeshjes)}
                </span>
              </div>

              {/* Scoreboard Area */}
              <div className="flex justify-between items-center my-4">
                <div className="flex-1 text-center font-medium text-gray-800 dark:text-slate-100 break-words leading-tight">
                  {match.ekipi_shtepiak}
                </div>
                <div className="px-4 text-2xl font-black text-gray-900 dark:text-slate-100 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-700 rounded-lg mx-3 py-1.5 min-w-[80px] text-center shadow-inner">
                  {match.golat_shtepiak} - {match.golat_mysafir}
                </div>
                <div className="flex-1 text-center font-medium text-gray-800 dark:text-slate-100 break-words leading-tight">
                  {match.ekipi_mysafir}
                </div>
              </div>

              {/* Notes */}
              {match.shenime && (
                <div className="text-xs text-gray-500 dark:text-slate-400 text-center italic mb-4 line-clamp-1 border-b border-gray-50 dark:border-slate-800 pb-3">
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
                <div className="text-sm text-gray-600 dark:text-slate-400 flex items-center">
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
                    <Edit className="w-4 h-4" />
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

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={!pagination.hasPrev}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
          >
            <ChevronLeft size={18} />
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
              (pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-2 rounded-lg font-medium transition-all ${
                    page === pageNum
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {pageNum}
                </button>
              ),
            )}
          </div>

          <button
            onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
            disabled={!pagination.hasNext}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
          >
            Next
            <ChevronRight size={18} />
          </button>

          <div className="w-full text-center text-sm text-gray-600 dark:text-slate-400 mt-4">
            Page {pagination.page} of {pagination.totalPages} • Total:{" "}
            {pagination.total} results
          </div>
        </div>
      )}

      {/* ADD NEW MATCH MODAL */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2x1 font-bold text-gray-800 dark:text-slate-100 mb-6">
              Watch Match Results
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Match Referees Section */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                    Match Referees
                  </label>
                  <div className="bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 dark:text-slate-200 rounded-lg p-4">
                    {selectedMatchForForm &&
                    getMatchReferees(selectedMatchForForm.id).length > 0 ? (
                      <div className="space-y-2">
                        {getMatchReferees(selectedMatchForForm.id).map(
                          (ref, idx) => (
                            <div key={idx} className="text-sm">
                              <p className="font-medium text-gray-800 dark:text-slate-200">
                                {ref.name}
                              </p>
                              <p className="text-gray-600 dark:text-slate-200 text-xs">
                                {ref.role} • {ref.category}
                              </p>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-slate-200 text-sm">
                        No referees assigned
                      </p>
                    )}
                  </div>
                </div>
                {/* Ndeshja ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                    Pick Match *
                  </label>
                  <select
                    name="ndeshja_id"
                    value={formData.ndeshja_id}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border ${formErrors.ndeshja_id ? "border-red-500" : "border-gray-300 dark:border-slate-700"} rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500`}
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
                  {formErrors.ndeshja_id && (
                    <p className="text-sm text-red-500 mt-1">
                      {formErrors.ndeshja_id}
                    </p>
                  )}
                  {eligibleMatches.length === 0 && (
                    <p className="text-xs text-amber-600 mt-2">
                      No finished matches available.
                    </p>
                  )}
                </div>
                {/* Golat shtepiak */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                    {terms.home}
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="golat_shtepiak"
                    value={formData.golat_shtepiak}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border ${formErrors.golat_shtepiak ? "border-red-500" : "border-gray-300 dark:border-slate-700"} rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500`}
                    placeholder={terms.home}
                    required
                  />
                  {formErrors.golat_shtepiak && (
                    <p className="text-sm text-red-500 mt-1">
                      {formErrors.golat_shtepiak}
                    </p>
                  )}
                </div>

                {/* Golat vizitor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                    {terms.away}
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="golat_mysafir"
                    value={formData.golat_mysafir}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border ${formErrors.golat_mysafir ? "border-red-500" : "border-gray-300 dark:border-slate-700"} rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500`}
                    placeholder={terms.away}
                    required
                  />
                  {formErrors.golat_mysafir && (
                    <p className="text-sm text-red-500 mt-1">
                      {formErrors.golat_mysafir}
                    </p>
                  )}
                </div>

                {/* Fituesi id */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                    Winner
                  </label>
                  <select
                    name="fitues_id"
                    value={formData.fitues_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                    Notes
                  </label>
                  <input
                    type="text"
                    name="shenime"
                    value={formData.shenime}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border ${formErrors.shenime ? "border-red-500" : "border-gray-300 dark:border-slate-700"} rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500`}
                    placeholder="Notes"
                  />
                  {formErrors.shenime && (
                    <p className="text-sm text-red-500 mt-1">
                      {formErrors.shenime}
                    </p>
                  )}
                </div>
                {/* MVP */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                    MVP
                  </label>
                  <select
                    type="text"
                    name="mvp_id"
                    value={formData.mvp_id}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border ${formErrors.mvp_id ? "border-red-500" : "border-gray-300 dark:border-slate-700"} rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500`}
                    placeholder="MVP Player"
                  >
                    <option value="">Select MVP</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.emri} {player.mbiemri}
                      </option>
                    ))}
                  </select>
                  {formErrors.mvp_id && (
                    <p className="text-sm text-red-500 mt-1">
                      {formErrors.mvp_id}
                    </p>
                  )}
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
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2x1 font-bold text-gray-800 dark:text-slate-200 mb-6">
              Edito Rezultatin
            </h3>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Match Referees Section */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                    Match Referees
                  </label>
                  <div className="bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-700 rounded-lg p-4">
                    {selectedMatchResult &&
                    getMatchReferees(selectedMatchResult.ndeshja_id).length >
                      0 ? (
                      <div className="space-y-2">
                        {getMatchReferees(selectedMatchResult.ndeshja_id).map(
                          (ref, idx) => (
                            <div key={idx} className="text-sm">
                              <p className="font-medium text-gray-700 dark:text-slate-200">
                                {ref.name}
                              </p>
                              <p className="text-gray-600 dark:text-slate-200 text-xs">
                                {ref.role} • {ref.category}
                              </p>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-slate-200 text-sm">
                        No referees assigned
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                    Select Match *
                  </label>
                  <select
                    name="ndeshja_id"
                    value={formData.ndeshja_id}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border ${formErrors.ndeshja_id ? "border-red-500" : "border-gray-300 dark:border-slate-700"} rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500`}
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
                          {getTeamNameById(match.ekipi_shtepiak_id)} vs{" "}
                          {getTeamNameById(match.ekipi_mysafir_id)} -{" "}
                          {formatDate(match.data_ndeshjes)}
                        </option>
                      ))}
                  </select>
                  {formErrors.ndeshja_id && (
                    <p className="text-sm text-red-500 mt-1">
                      {formErrors.ndeshja_id}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                    {terms.home}
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="golat_shtepiak"
                    value={formData.golat_shtepiak}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border ${formErrors.golat_shtepiak ? "border-red-500" : "border-gray-300 dark:border-slate-700"} rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500`}
                    required
                  />
                  {formErrors.golat_shtepiak && (
                    <p className="text-sm text-red-500 mt-1">
                      {formErrors.golat_shtepiak}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                    {terms.away}
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="golat_mysafir"
                    value={formData.golat_mysafir}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border ${formErrors.golat_mysafir ? "border-red-500" : "border-gray-300 dark:border-slate-700"} rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500`}
                    required
                  />
                  {formErrors.golat_mysafir && (
                    <p className="text-sm text-red-500 mt-1">
                      {formErrors.golat_mysafir}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                    Winner
                  </label>
                  <select
                    name="fitues_id"
                    value={formData.fitues_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                    Notes
                  </label>
                  <input
                    type="text"
                    name="shenime"
                    value={formData.shenime}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border ${formErrors.shenime ? "border-red-500" : "border-gray-300 dark:border-slate-700"} rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500`}
                  />
                  {formErrors.shenime && (
                    <p className="text-sm text-red-500 mt-1">
                      {formErrors.shenime}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                    MVP
                  </label>
                  <select
                    name="mvp_id"
                    value={formData.mvp_id}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border ${formErrors.mvp_id ? "border-red-500" : "border-gray-300 dark:border-slate-700"} rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500`}
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
            className="w-full max-w-md rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-red-600 mb-4">
              Delete result?
            </h3>
            <p className="text-gray-700 dark:text-slate-200 mb-6">
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
