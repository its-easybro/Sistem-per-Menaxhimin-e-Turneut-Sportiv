import { useContext, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import * as yup from "yup";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";
import MatchTimer from "../../components/MatchTimer";
import socket from "../../socket";
import { Edit, Trash2 } from "lucide-react";
import TableSkeleton from "../../components/Skeletons/TableSkeleton"

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

const matchCreateionSchema = yup.object().shape({
  turneu_id: yup.number().typeError("Tournament must be a number").required("Tournament is required"),
  ekipi_shtepiak_id: yup.number().typeError("Home team must be a number").required("Home team is required"),
  ekipi_mysafir_id: yup.number().typeError("Away team must be a number").required("Away team is required"),
  data_ndeshjes: yup.string().required("Match date is required"),
  ora_fillimit: yup.string().required("Start time is required"),
  fusha_id: yup.number().typeError("Field must be a number").nullable().optional(),
  statusi: yup
    .string()
    .oneOf(["Planifikuar", "Live", "Përfunduar", "Shtyrë", "Anuluar"])
    .required(),
  faza: yup.string().optional(),
});

const matchUpdateSchema = yup.object().shape({
  turneu_id: yup.number().typeError("Tournament must be a number").required("Tournament is required"),
  ekipi_shtepiak_id: yup.number().typeError("Home team must be a number").required("Home team is required"),
  ekipi_mysafir_id: yup.number().typeError("Away team must be a number").required("Away team is required"),
  data_ndeshjes: yup.string().required("Match date is required"),
  ora_fillimit: yup.string().required("Start time is required"),
  fusha_id: yup.number().typeError("Field must be a number").nullable().optional(),
  statusi: yup
    .string()
    .oneOf(["Planifikuar", "Live", "Përfunduar", "Shtyrë", "Anuluar"])
    .required(),
  faza: yup.string().optional(),
});

// Organizer match page keeps its own form state separate from the admin matches page.
function formatDate(value) {
  if (!value) return "N/A";

  try {
    return new Intl.DateTimeFormat("en-GB").format(new Date(value));
  } catch {
    return "Invalid date";
  }
}

function formatDateInput(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function formatTime(value) {
  if (!value) return "";
  const text = String(value);

  if (text.includes("T")) {
    return text.slice(11, 16);
  }

  return text.slice(0, 5);
}

export default function OrganizerMatches() {
  const { user } = useContext(AuthContext);
  const [matches, setMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [alert, setAlert] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formErrors, setFormErrors] = useState({});

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

  useEffect(() => {
    const handleMatchLive = ({ matchId }) => {
      setMatches((prev) =>
        prev.map((match) =>
          match.id === matchId ? { ...match, statusi: "Live" } : match,
        ),
      );
    };

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

  const getTournamentName = (id) =>
    tournaments.find((item) => item.id === id)?.emertimi || "N/A";

  const getTeamName = (id) =>
    teams.find((item) => item.id === id)?.emertimi || "N/A";

  const getVenueName = (id) =>
    venues.find((item) => item.id === id)?.emertimi || "N/A";

  const filteredMatches = matches.filter((item) => {
    const query = searchQuery.toLowerCase();

    return (
      getTournamentName(item.turneu_id).toLowerCase().includes(query) ||
      getTeamName(item.ekipi_shtepiak_id).toLowerCase().includes(query) ||
      getTeamName(item.ekipi_mysafir_id).toLowerCase().includes(query)
    );
  });

  const resetForm = () => setFormData(initialFormData);

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

  const buildPayload = () => ({
    // Converts select values back to numeric ids before hitting the API.
    ...formData,
    turneu_id: Number(formData.turneu_id),
    ekipi_shtepiak_id: Number(formData.ekipi_shtepiak_id),
    ekipi_mysafir_id: Number(formData.ekipi_mysafir_id),
    fusha_id: formData.fusha_id ? Number(formData.fusha_id) : null,
  });

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
      <div className="rounded-xl bg-white p-6 text-sm text-red-600 shadow-sm">
        Error: {error}
      </div>
    );
  }

  const MatchForm = ({ onSubmit, submitLabel }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700">Tournament</span>
          <select
            name="turneu_id"
            value={formData.turneu_id}
            onChange={handleInputChange}
            className={`rounded-lg border px-3 py-2 ${formErrors.turneu_id ? "border-red-500" : "border-gray-300"}`}
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
            <p className="text-red-500 text-xs">{formErrors.turneu_id}</p>
          )}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700">Venue</span>
          <select
            name="fusha_id"
            value={formData.fusha_id}
            onChange={handleInputChange}
            className={`rounded-lg border px-3 py-2 ${formErrors.fusha_id ? "border-red-500" : "border-gray-300"}`}
          >
            <option value="">Select venue</option>
            {venues.map((item) => (
              <option key={item.id} value={item.id}>
                {item.emertimi}
              </option>
            ))}
          </select>
          {formErrors.fusha_id && (
            <p className="text-red-500 text-xs">{formErrors.fusha_id}</p>
          )}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700">Home Team</span>
          <select
            name="ekipi_shtepiak_id"
            value={formData.ekipi_shtepiak_id}
            onChange={handleInputChange}
            className={`rounded-lg border px-3 py-2 ${formErrors.ekipi_shtepiak_id ? "border-red-500" : "border-gray-300"}`}
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
            <p className="text-red-500 text-xs">
              {formErrors.ekipi_shtepiak_id}
            </p>
          )}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700">Away Team</span>
          <select
            name="ekipi_mysafir_id"
            value={formData.ekipi_mysafir_id}
            onChange={handleInputChange}
            className={`rounded-lg border px-3 py-2 ${formErrors.ekipi_mysafir_id ? "border-red-500" : "border-gray-300"}`}
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
            <p className="text-red-500 text-xs">
              {formErrors.ekipi_mysafir_id}
            </p>
          )}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700">Match Date</span>
          <input
            type="date"
            name="data_ndeshjes"
            value={formData.data_ndeshjes}
            onChange={handleInputChange}
            className={`rounded-lg border px-3 py-2 ${formErrors.data_ndeshjes ? "border-red-500" : "border-gray-300"}`}
            required
          />
          {formErrors.data_ndeshjes && (
            <p className="text-red-500 text-xs">{formErrors.data_ndeshjes}</p>
          )}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700">Start Time</span>
          <input
            type="time"
            name="ora_fillimit"
            value={formData.ora_fillimit}
            onChange={handleInputChange}
            className={`rounded-lg border px-3 py-2 ${formErrors.ora_fillimit ? "border-red-500" : "border-gray-300"}`}
          />
          {formErrors.ora_fillimit && (
            <p className="text-red-500 text-xs">{formErrors.ora_fillimit}</p>
          )}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700">Status</span>
          <select
            name="statusi"
            value={formData.statusi}
            onChange={handleInputChange}
            className={`rounded-lg border px-3 py-2 ${formErrors.statusi ? "border-red-500" : "border-gray-300"}`}
          >
            <option value="Planifikuar">Planifikuar</option>
            <option value="Live">Live</option>
            <option value="Përfunduar">Përfunduar</option>
            <option value="Shtyrë">Shtyrë</option>
            <option value="Anuluar">Anuluar</option>
          </select>
          {formErrors.statusi && (
            <p className="text-red-500 text-xs">{formErrors.statusi}</p>
          )}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700">Phase</span>
          <input
            type="text"
            name="faza"
            value={formData.faza}
            onChange={handleInputChange}
            className={`rounded-lg border px-3 py-2 ${formErrors.faza ? "border-red-500" : "border-gray-300"}`}
            placeholder="e.g. Semi-final"
          />
          {formErrors.faza && (
            <p className="text-red-500 text-xs">{formErrors.faza}</p>
          )}
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white"
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
          className="flex-1 rounded-lg bg-gray-400 px-4 py-2 font-semibold text-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Tournament Matches
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Create and manage matches only for your tournaments.
            </p>
          </div>
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
          className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-3"
        />

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-gray-800 text-white">
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
            <tbody className="divide-y divide-gray-200">
              {filteredMatches.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-4 py-8 text-center text-gray-600"
                  >
                    No matches found for your tournaments.
                  </td>
                </tr>
              ) : (
                filteredMatches.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {getTournamentName(item.turneu_id)}
                    </td>
                    <td className="px-4 py-3">
                      {getTeamName(item.ekipi_shtepiak_id)}
                    </td>
                    <td className="px-4 py-3">
                      {getTeamName(item.ekipi_mysafir_id)}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(item.data_ndeshjes)}
                    </td>
                    <td className="px-4 py-3">{getVenueName(item.fusha_id)}</td>
                    <td className="px-4 py-3">{item.statusi || "N/A"}</td>
                    <td className="px-4 py-3 text-center">
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

      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-3xl rounded-xl bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-6 text-2xl font-bold text-gray-900">Add Match</h2>
            <MatchForm onSubmit={handleCreate} submitLabel="Create Match" />
          </div>
        </div>
      )}

      {showEditModal && selectedMatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="w-full max-w-3xl rounded-xl bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              Edit Match
            </h2>
            <MatchForm onSubmit={handleUpdate} submitLabel="Save Changes" />
          </div>
        </div>
      )}

      {showDeleteModal && selectedMatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Delete Match
            </h2>
            <p className="mb-6 text-gray-600">
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
                className="flex-1 rounded-lg bg-gray-400 px-4 py-2 font-semibold text-white"
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
