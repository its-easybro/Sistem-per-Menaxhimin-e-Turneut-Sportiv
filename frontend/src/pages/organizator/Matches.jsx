import { useContext, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import * as yup from "yup";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";
import MatchTimer from "../../components/MatchTimer";
import socket from "../../socket";
import { Edit, Trash2, X } from "lucide-react";
import TableSkeleton from "../../components/Skeletons/TableSkeleton";

const initialFormData = {
  turneu_id: "",
  ekipi_shtepiak_id: "",
  ekipi_mysafir_id: "",
  data_ndeshjes: "",
  ora_fillimit: "",
  fusha_id: "",
  statusi: "Planifikuar",
  faza: "",
};

// Yup validation schemas for match creation and update forms.
const matchCreateionSchema = yup.object().shape({
  turneu_id: yup
    .number()
    .typeError("Tournament must be a number")
    .required("Tournament is required"),
  ekipi_shtepiak_id: yup
    .number()
    .typeError("Home team must be a number")
    .required("Home team is required"),
  ekipi_mysafir_id: yup
    .number()
    .typeError("Away team must be a number")
    .required("Away team is required"),
  data_ndeshjes: yup.string().required("Match date is required"),
  ora_fillimit: yup.string().required("Start time is required"),
  fusha_id: yup
    .number()
    .typeError("Field must be a number")
    .nullable()
    .optional(),
  statusi: yup
    .string()
    .oneOf(["Planifikuar", "Live", "Përfunduar", "Shtyrë", "Anuluar"])
    .required(),
  faza: yup.string().optional(),
});

const _matchUpdateSchema = yup.object().shape({
  turneu_id: yup
    .number()
    .typeError("Tournament must be a number")
    .required("Tournament is required"),
  ekipi_shtepiak_id: yup
    .number()
    .typeError("Home team must be a number")
    .required("Home team is required"),
  ekipi_mysafir_id: yup
    .number()
    .typeError("Away team must be a number")
    .required("Away team is required"),
  data_ndeshjes: yup.string().required("Match date is required"),
  ora_fillimit: yup.string().required("Start time is required"),
  fusha_id: yup
    .number()
    .typeError("Field must be a number")
    .nullable()
    .optional(),
  statusi: yup
    .string()
    .oneOf(["Planifikuar", "Live", "Përfunduar", "Shtyrë", "Anuluar"])
    .required(),
  faza: yup.string().optional(),
});

// Organizer match page keeps its own form state separate from the admin matches page.
/**
 * Formats a date value into a human-readable "en-GB" locale string (dd/mm/yyyy).
 * Returns "N/A" for falsy inputs and "Invalid date" when parsing fails.
 *
 * @param {string|Date|null} value - The raw date value to format
 * @returns {string} The formatted date string or a fallback label
 */
function formatDate(value) {
  if (!value) return "N/A";

  try {
    return new Intl.DateTimeFormat("en-GB").format(new Date(value));
  } catch {
    return "Invalid date";
  }
}

/**
 * Extracts the first 10 characters from a date string to produce a
 * "YYYY-MM-DD" value suitable for HTML date inputs.
 *
 * @param {string|null} value - The raw date string (e.g. ISO 8601)
 * @returns {string} A date string trimmed to 10 characters, or an empty string
 */
function formatDateInput(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

/**
 * Converts a time string or ISO datetime into an "HH:MM" format
 * suitable for HTML time inputs. Handles both "T"-delimited ISO strings
 * and plain "HH:MM:SS" time strings.
 *
 * @param {string|null} value - The raw time or datetime string
 * @returns {string} A 5-character "HH:MM" string, or an empty string
 */
function formatTime(value) {
  if (!value) return "";
  const text = String(value);

  if (text.includes("T")) {
    return text.slice(11, 16);
  }

  return text.slice(0, 5);
}

/**
 * OrganizerMatches – main page component for organizers to manage tournament matches.
 * Provides full CRUD functionality for matches scoped to the organizer's own tournaments.
 * Includes search, date-range filtering, real-time socket updates, and modal-based forms.
 *
 * @returns {JSX.Element} The organizer matches management page
 */
export default function OrganizerMatches() {
  const { user } = useContext(AuthContext);

  // --- Domain data fetched from the API ---
  const [matches, setMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [venues, setVenues] = useState([]);

  // --- UI / loading state ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- Search and date-range filter state ---
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");

  // --- Form and modal state ---
  const [formData, setFormData] = useState(initialFormData);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [alert, setAlert] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Fetches all domain data (matches, tournaments, registrations, teams, venues) when the user object changes
  useEffect(() => {
    const loadData = async () => {
      if (!user?.is_organizer) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        // The backend already filters tournaments, matches, and registrations to the organizer's scope.
        const [
          matchesRes,
          tournamentsRes,
          registrationsRes,
          teamsRes,
          venuesRes,
        ] = await Promise.all([
          api.get("/matches"),
          api.get("/tournaments"),
          api.get("/tournament-registrations"),
          api.get("/teams"),
          api.get("/venues"),
        ]);

        setMatches(Array.isArray(matchesRes.data) ? matchesRes.data : []);
        setTournaments(
          Array.isArray(tournamentsRes.data) ? tournamentsRes.data : [],
        );
        setRegistrations(
          Array.isArray(registrationsRes.data) ? registrationsRes.data : [],
        );
        setTeams(Array.isArray(teamsRes.data) ? teamsRes.data : []);
        setVenues(Array.isArray(venuesRes.data) ? venuesRes.data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Subscribes to WebSocket events to update match status in real-time ("Live" / "Përfunduar")
  useEffect(() => {
    /** @param {{ matchId: number }} param0 - Socket payload with match ID */
    const handleMatchLive = ({ matchId }) => {
      setMatches((prev) =>
        prev.map((match) =>
          match.id === matchId ? { ...match, statusi: "Live" } : match,
        ),
      );
    };

    /** @param {{ matchId: number }} param0 - Socket payload with match ID */
    const handleMatchFinished = ({ matchId }) => {
      setMatches((prev) =>
        prev.map((match) =>
          match.id === matchId ? { ...match, statusi: "Përfunduar" } : match,
        ),
      );
    };

    socket.on("match_live", handleMatchLive);
    socket.on("match_finished", handleMatchFinished);

    return () => {
      socket.off("match_live", handleMatchLive);
      socket.off("match_finished", handleMatchFinished);
    };
  }, []);

  // Derives the list of teams eligible for match selection based on the chosen tournament's approved registrations
  const availableTeams = useMemo(() => {
    if (!formData.turneu_id) return [];

    // Only teams registered in the selected tournament can be used in new matches.
    const teamIds = registrations
      .filter(
        (item) =>
          String(item.turneu_id) === String(formData.turneu_id) &&
          item.statusi === "Aprovuar",
      )
      .map((item) => item.ekipi_id);

    return teams.filter((team) => teamIds.includes(team.id));
  }, [formData.turneu_id, registrations, teams]);

  /**
   * Looks up a tournament's display name by its ID.
   * @param {number} id - The tournament ID
   * @returns {string} The tournament name or "N/A" if not found
   */
  const getTournamentName = (id) =>
    tournaments.find((item) => item.id === id)?.emertimi || "N/A";

  /**
   * Looks up a team's display name by its ID.
   * @param {number} id - The team ID
   * @returns {string} The team name or "N/A" if not found
   */
  const getTeamName = (id) =>
    teams.find((item) => item.id === id)?.emertimi || "N/A";

  /**
   * Looks up a venue's display name by its ID.
   * @param {number} id - The venue ID
   * @returns {string} The venue name or "N/A" if not found
   */
  const getVenueName = (id) =>
    venues.find((item) => item.id === id)?.emertimi || "N/A";

  const hasActiveFilters = dateFromFilter !== "" || dateToFilter !== "";

  /**
   * Resets both "from" and "to" date filter inputs back to empty strings,
   * effectively removing the date-range filter from the match list.
   */
  const handleClearDateFilters = () => {
    setDateFromFilter("");
    setDateToFilter("");
  };

  // Filters the matches array by search query (tournament/team names) and optional date range
  const filteredMatches = matches.filter((item) => {
    const query = searchQuery.toLowerCase();
    const matchDate = new Date(item.data_ndeshjes);
    const fromDate = dateFromFilter ? new Date(dateFromFilter) : null;
    const toDate = dateToFilter ? new Date(dateToFilter) : null;

    const matchesSearch =
      getTournamentName(item.turneu_id).toLowerCase().includes(query) ||
      getTeamName(item.ekipi_shtepiak_id).toLowerCase().includes(query) ||
      getTeamName(item.ekipi_mysafir_id).toLowerCase().includes(query);

    const matchesDateRange =
      (!fromDate || matchDate >= fromDate) && (!toDate || matchDate <= toDate);

    return matchesSearch && matchesDateRange;
  });

  /** Resets the match form back to its default (empty) state. */
  const resetForm = () => setFormData(initialFormData);

  /**
   * Generic input change handler for the match form.
   * Updates the corresponding field in formData and clears any validation
   * error tied to that field. When the tournament field changes, the
   * home and away team selections are reset because the available teams depend on the tournament.
   *
   * @param {React.ChangeEvent<HTMLInputElement|HTMLSelectElement>} e - The DOM change event
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "turneu_id") {
        // Resets selected teams when the organizer switches to another tournament.
        next.ekipi_shtepiak_id = "";
        next.ekipi_mysafir_id = "";
      }

      return next;
    });

    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  /**
   * Builds the API request payload from the current formData.
   * Converts string IDs from the select elements back to numeric types
   * expected by the backend.
   *
   * @returns {Object} A match payload ready for POST / PUT requests
   */
  const buildPayload = () => ({
    // Converts select values back to numeric ids before hitting the API.
    ...formData,
    turneu_id: Number(formData.turneu_id),
    ekipi_shtepiak_id: Number(formData.ekipi_shtepiak_id),
    ekipi_mysafir_id: Number(formData.ekipi_mysafir_id),
    fusha_id: formData.fusha_id ? Number(formData.fusha_id) : null,
  });

  /**
   * Validates the current formData against the Yup schema.
   * If validation fails, maps each field-level error into the formErrors state
   * so the UI can display inline messages.
   *
   * @returns {Promise<boolean>} true when the form is valid, false otherwise
   */
  const validateForm = async () => {
    try {
      setFormErrors({});
      await matchCreateionSchema.validate(formData, { abortEarly: false });
      return true;
    } catch (err) {
      if (err.inner) {
        const validationErrors = {};
        err.inner.forEach((error) => {
          validationErrors[error.path] = error.message;
        });
        setFormErrors(validationErrors);
      }
      return false;
    }
  };

  /**
   * Validates match form data and creates a new match via the API.
   * Ensures home and away teams are different before submission.
   * On success, updates the local match list and resets the form.
   *
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event
   */
  const handleCreate = async (e) => {
    e.preventDefault();

    if (formData.ekipi_shtepiak_id === formData.ekipi_mysafir_id) {
      setAlert({
        type: "error",
        message: "Home team and away team must be different.",
      });
      return;
    }

    const isValid = await validateForm();
    if (!isValid) return;

    try {
      const response = await api.post("/matches", buildPayload());
      setMatches((prev) => [...prev, response.data]);
      setShowCreateModal(false);
      resetForm();
      setFormErrors({});
      setAlert({ type: "success", message: "Match created successfully!" });
    } catch (err) {
      setAlert({
        type: "error",
        message: "Error creating match: " + err.message,
      });
    }
  };

  /**
   * Submits updated match details to the API.
   * Validates the form data and ensures home and away teams are distinct.
   * Updates the match record in the local state array upon a successful API response.
   *
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event
   */
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedMatch) return;

    if (formData.ekipi_shtepiak_id === formData.ekipi_mysafir_id) {
      setAlert({
        type: "error",
        message: "Home team and away team must be different.",
      });
      return;
    }

    const isValid = await validateForm();
    if (!isValid) return;

    try {
      const response = await api.put(
        `/matches/${selectedMatch.id}`,
        buildPayload(),
      );
      setMatches((prev) =>
        prev.map((item) =>
          item.id === response.data.id ? response.data : item,
        ),
      );
      setShowEditModal(false);
      setSelectedMatch(null);
      resetForm();
      setFormErrors({});
      setAlert({ type: "success", message: "Match updated successfully!" });
    } catch (err) {
      setAlert({
        type: "error",
        message: "Error updating match: " + err.message,
      });
    }
  };

  /**
   * Deletes the selected match from the database via the API.
   * Removes the deleted match from the local state array and closes the confirmation modal.
   */
  const handleDelete = async () => {
    if (!selectedMatch) return;

    try {
      await api.delete(`/matches/${selectedMatch.id}`);
      setMatches((prev) => prev.filter((item) => item.id !== selectedMatch.id));
      setShowDeleteModal(false);
      setSelectedMatch(null);
      setAlert({ type: "success", message: "Match deleted successfully!" });
    } catch (err) {
      setAlert({
        type: "error",
        message: "Error deleting match: " + err.message,
      });
    }
  };

  /**
   * Prepares the edit modal by populating formData with the selected match's
   * current values (converting IDs to strings for the select elements) and
   * opening the edit modal.
   *
   * @param {Object} match - The match record to edit
   */
  const openEdit = (match) => {
    setSelectedMatch(match);
    setFormData({
      turneu_id: String(match.turneu_id),
      ekipi_shtepiak_id: String(match.ekipi_shtepiak_id),
      ekipi_mysafir_id: String(match.ekipi_mysafir_id),
      data_ndeshjes: formatDateInput(match.data_ndeshjes),
      ora_fillimit: formatTime(match.ora_fillimit),
      fusha_id: match.fusha_id ? String(match.fusha_id) : "",
      statusi: match.statusi || "Planifikuar",
      faza: match.faza || "",
    });
    setShowEditModal(true);
  };

  /**
   * Sets the match to be deleted and opens the delete confirmation modal.
   *
   * @param {Object} match - The match record the user wants to delete
   */
  const openDelete = (match) => {
    setSelectedMatch(match);
    setShowDeleteModal(true);
  };

  if (!user || !user.is_organizer) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="delay-skeleton">
        <TableSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-6 text-sm text-red-600 shadow-sm dark:bg-slate-900 dark:text-red-400 dark:border-slate-800 dark:bg-slate-900 dark:text-red-400">
        Error: {error}
      </div>
    );
  }

  /**
   * Reusable match form component rendered inside both the Create and Edit modals.
   * Contains tournament, venue, team, date, time, status, and phase fields.
   *
   * @param {{ onSubmit: Function, submitLabel: string }} props
   * @returns {JSX.Element} The match form JSX
   */
  const MatchForm = ({ onSubmit, submitLabel }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-200 dark:text-slate-200">
            Tournament
          </span>
          <select
            name="turneu_id"
            value={formData.turneu_id}
            onChange={handleInputChange}
            className={`rounded-lg border px-3 py-2 bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100 ${formErrors.turneu_id ? "border-red-500" : "border-gray-300 dark:border-slate-700"}`}
            required
          >
            <option value="">Select tournament</option>
            {/* Organizer sees only tournaments assigned to them. */}
            {tournaments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.emertimi}
              </option>
            ))}
          </select>
          {formErrors.turneu_id && (
            <p className="text-xs text-red-500 dark:text-red-400">
              {formErrors.turneu_id}
            </p>
          )}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-200 dark:text-slate-200">
            Venue
          </span>
          <select
            name="fusha_id"
            value={formData.fusha_id}
            onChange={handleInputChange}
            className={`rounded-lg border px-3 py-2 bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100 ${formErrors.fusha_id ? "border-red-500" : "border-gray-300 dark:border-slate-700"}`}
          >
            <option value="">Select venue</option>
            {venues.map((item) => (
              <option key={item.id} value={item.id}>
                {item.emertimi}
              </option>
            ))}
          </select>
          {formErrors.fusha_id && (
            <p className="text-xs text-red-500 dark:text-red-400">
              {formErrors.fusha_id}
            </p>
          )}
        </label>

        {/* Home Team */}
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-200 dark:text-slate-200">
            Home Team
          </span>
          <select
            name="ekipi_shtepiak_id"
            value={formData.ekipi_shtepiak_id}
            onChange={handleInputChange}
            className={`rounded-lg border px-3 py-2 bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100 ${formErrors.ekipi_shtepiak_id ? "border-red-500" : "border-gray-300 dark:border-slate-700"}`}
            required
          >
            <option value="">Select home team</option>
            {/* Team options are limited to registrations of the selected tournament. */}
            {availableTeams.map((item) => (
              <option key={item.id} value={item.id}>
                {item.emertimi}
              </option>
            ))}
          </select>
          {formErrors.ekipi_shtepiak_id && (
            <p className="text-xs text-red-500 dark:text-red-400">
              {formErrors.ekipi_shtepiak_id}
            </p>
          )}
        </label>

        {/* Away Team */}
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-200 dark:text-slate-200">
            Away Team
          </span>
          <select
            name="ekipi_mysafir_id"
            value={formData.ekipi_mysafir_id}
            onChange={handleInputChange}
            className={`rounded-lg border px-3 py-2 bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100 ${formErrors.ekipi_mysafir_id ? "border-red-500" : "border-gray-300 dark:border-slate-700"}`}
            required
          >
            <option value="">Select away team</option>
            {/* Team options are limited to registrations of the selected tournament. */}
            {availableTeams.map((item) => (
              <option key={item.id} value={item.id}>
                {item.emertimi}
              </option>
            ))}
          </select>
          {formErrors.ekipi_mysafir_id && (
            <p className="text-xs text-red-500 dark:text-red-400">
              {formErrors.ekipi_mysafir_id}
            </p>
          )}
        </label>

        {/* Match Date */}
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-200 dark:text-slate-200">
            Match Date
          </span>
          <input
            type="date"
            name="data_ndeshjes"
            value={formData.data_ndeshjes}
            onChange={handleInputChange}
            className={`rounded-lg border px-3 py-2 bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100 ${formErrors.data_ndeshjes ? "border-red-500" : "border-gray-300 dark:border-slate-700"}`}
            required
          />
          {formErrors.data_ndeshjes && (
            <p className="text-xs text-red-500 dark:text-red-400">
              {formErrors.data_ndeshjes}
            </p>
          )}
        </label>

        {/* Start Time */}
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-200 dark:text-slate-200">
            Start Time
          </span>
          <input
            type="time"
            name="ora_fillimit"
            value={formData.ora_fillimit}
            onChange={handleInputChange}
            className={`rounded-lg border px-3 py-2 bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100 ${formErrors.ora_fillimit ? "border-red-500" : "border-gray-300 dark:border-slate-700"}`}
          />
          {formErrors.ora_fillimit && (
            <p className="text-xs text-red-500 dark:text-red-400">
              {formErrors.ora_fillimit}
            </p>
          )}
        </label>

        {/* Status */}
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-200 dark:text-slate-200">
            Status
          </span>
          <select
            name="statusi"
            value={formData.statusi}
            onChange={handleInputChange}
            className={`rounded-lg border px-3 py-2 bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100 ${formErrors.statusi ? "border-red-500" : "border-gray-300 dark:border-slate-700"}`}
          >
            <option value="Planifikuar">Planifikuar</option>
            <option value="Live">Live</option>
            <option value="Përfunduar">Përfunduar</option>
            <option value="Shtyrë">Shtyrë</option>
            <option value="Anuluar">Anuluar</option>
          </select>
          {formErrors.statusi && (
            <p className="text-xs text-red-500 dark:text-red-400">
              {formErrors.statusi}
            </p>
          )}
        </label>

        {/* Phase */}
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-200 dark:text-slate-200">
            Phase
          </span>
          <input
            type="text"
            name="faza"
            value={formData.faza}
            onChange={handleInputChange}
            className={`rounded-lg border px-3 py-2 bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100 ${formErrors.faza ? "border-red-500" : "border-gray-300 dark:border-slate-700"}`}
            placeholder="e.g. Semi-final"
          />
          {formErrors.faza && (
            <p className="text-xs text-red-500 dark:text-red-400">
              {formErrors.faza}
            </p>
          )}
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-700"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setFormErrors({});
            setSelectedMatch(null);
            setShowCreateModal(false);
            setShowEditModal(false);
          }}
          className="flex-1 rounded-lg bg-gray-400 px-4 py-2 font-semibold text-white transition hover:bg-gray-500 dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6 text-gray-900 dark:text-slate-100">
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border dark:border-slate-800 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 dark:text-slate-100">
              Tournament Matches
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400 dark:text-slate-400">
              Create and manage matches only for your tournaments.
            </p>
          </div>
          {/* Add Match Button */}
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="rounded-lg bg-green-600 px-5 py-2 font-semibold text-white"
          >
            Add Match
          </button>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by tournament or team"
          className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-green-500 dark:placeholder:text-slate-400"
        />

        <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-lg bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-800 p-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
              From:
            </label>
            <input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
              To:
            </label>
            <input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Clear Date Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleClearDateFilters}
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
            >
              <X size={14} />
              Clear
            </button>
          )}
        </div>

        {/* Matches Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800">
          <table className="w-full border-collapse text-left">
            <thead className="bg-gray-800 text-white dark:bg-slate-800 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3">Tournament</th>
                <th className="px-4 py-3">Home Team</th>
                <th className="px-4 py-3">Away Team</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Venue</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Timer</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {filteredMatches.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-4 py-8 text-center text-gray-600 dark:text-slate-400 dark:bg-slate-900 dark:text-slate-400"
                  >
                    No matches found for your tournaments.
                  </td>
                </tr>
              ) : (
                filteredMatches.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100">
                      {getTournamentName(item.turneu_id)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-slate-200 text-gray-700 dark:text-slate-300">
                      {getTeamName(item.ekipi_shtepiak_id)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-slate-200 text-gray-700 dark:text-slate-300">
                      {getTeamName(item.ekipi_mysafir_id)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-slate-200 text-gray-700 dark:text-slate-300">
                      {formatDate(item.data_ndeshjes)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-slate-200 text-gray-700 dark:text-slate-300">
                      {getVenueName(item.fusha_id)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-slate-200 text-gray-700 dark:text-slate-300">
                      {item.statusi || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-slate-200 text-gray-700 dark:text-slate-300">
                      <MatchTimer match={item} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="rounded bg-yellow-500 p-2 text-sm font-medium text-white"
                          title="edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => openDelete(item)}
                          className="rounded bg-red-500 p-2 text-sm font-medium text-white"
                          title="delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Match Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm dark:bg-slate-950/80"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-3xl rounded-xl border border-transparent bg-white p-8 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-slate-100 dark:text-slate-100">
              Add Match
            </h2>
            <MatchForm onSubmit={handleCreate} submitLabel="Create Match" />
          </div>
        </div>
      )}

      {/* Edit Match Modal */}
      {showEditModal && selectedMatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm dark:bg-slate-950/80"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="w-full max-w-3xl rounded-xl bg-white p-8 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-slate-100">
              Edit Match
            </h2>
            <MatchForm onSubmit={handleUpdate} submitLabel="Save Changes" />
          </div>
        </div>
      )}

      {/* Delete Match Modal */}
      {showDeleteModal && selectedMatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm dark:bg-slate-950/80"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-slate-100">
              Delete Match
            </h2>
            <p className="mb-6 text-gray-600 dark:text-slate-300">
              Delete match{" "}
              <strong>
                {getTeamName(selectedMatch.ekipi_shtepiak_id)} vs{" "}
                {getTeamName(selectedMatch.ekipi_mysafir_id)}
              </strong>
              ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-lg bg-gray-400 px-4 py-2 font-semibold text-white transition hover:bg-gray-500 dark:bg-slate-700 dark:hover:bg-slate-600"
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
