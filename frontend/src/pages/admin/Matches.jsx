import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import * as yup from "yup";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";
import { Edit, Trash2, Eye } from "lucide-react";
import MatchTimer from "../../components/MatchTimer";
import socket from "../../socket";
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

const formatDateInput = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const formatTime = (value) => {
  if (!value) return "";
  const text = String(value);

  if (text.includes("T")) {
    return text.slice(11, 16);
  }

  return text.slice(0, 5);
};

const initialEventForm = {
  lloji: "Goal",
  ekipi_id: "",
};

const teamRequiredEventTypes = ["Goal", "YellowCard", "RedCard"];

function getEventMinute(event) {
  const minute = event.minute ?? event.minuta;
  return minute === null || minute === undefined || minute === "" ? "-" : `${minute}'`;
}

function getEventTypeLabel(type) {
  const labels = {
    Goal: "Goal",
    YellowCard: "Yellow card",
    RedCard: "Red card",
  };

  return labels[type] || type || "Event";
}

function sortMatchEvents(events) {
  return [...events].sort((a, b) => {
    const minuteA = Number.isFinite(Number(a.minute ?? a.minuta))
      ? Number(a.minute ?? a.minuta)
      : Number.MAX_SAFE_INTEGER;
    const minuteB = Number.isFinite(Number(b.minute ?? b.minuta))
      ? Number(b.minute ?? b.minuta)
      : Number.MAX_SAFE_INTEGER;

    if (minuteA !== minuteB) return minuteA - minuteB;
    return Number(a.id || 0) - Number(b.id || 0);
  });
}

function isLiveMatch(match) {
  return match?.statusi === "Live";
}

function isHalfTimeMatch(match) {
  return match?.statusi === "HalfTime";
}

function isFinishedMatch(match) {
  return match?.statusi === "Përfunduar" || match?.statusi === "PÃ«rfunduar";
}

const matchCreateSchema = yup.object().shape({
  turneu_id: yup.string().required("Tournament is required"),
  ekipi_shtepiak_id: yup.string().required("Home team is required"),
  ekipi_mysafir_id: yup.string().required("Away team is required"),
  data_ndeshjes: yup.string().required("Match date is required"),
  ora_fillimit: yup.string().required("Start time is required"),
  fusha_id: yup.string().nullable(),
  referi_id: yup.string().nullable(),
  statusi: yup.string().required("Status is required"),
  faza: yup.string(),
});

const matchUpdateSchema = yup.object().shape({
  turneu_id: yup.string(),
  ekipi_shtepiak_id: yup.string(),
  ekipi_mysafir_id: yup.string(),
  data_ndeshjes: yup.string(),
  ora_fillimit: yup.string(),
  fusha_id: yup.string().nullable(),
  referi_id: yup.string().nullable(),
  statusi: yup.string(),
  faza: yup.string(),
});

export default function Matches() {
  // Central admin page for managing matches and linked tournament/team/venue data.
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // State Variables
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [matchReferees, setMatchReferees] = useState([]);
  const [referees, setReferees] = useState([]);
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
  const [scoreForm, setScoreForm] = useState({
    golat_shtepiak: 0,
    golat_mysafir: 0,
  });
  const [matchEvents, setMatchEvents] = useState([]);
  const [eventForm, setEventForm] = useState(initialEventForm);
  const [formData, setFormData] = useState({
    turneu_id: "",
    ekipi_shtepiak_id: "",
    ekipi_mysafir_id: "",
    data_ndeshjes: "",
    ora_fillimit: "",
    fusha_id: "",
    referi_id: "",
    statusi: "Planifikuar",
    faza: "",
  });
  const [formErrors, setFormErrors] = useState({});

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
          matchRefereesResponse,
          refereesResponse,
          venuesResponse,
        ] = await Promise.all([
          api.get(`/matches`),
          api.get(`tournaments`),
          api.get(`teams`),
          api.get(`/tournament-registrations`),
          api.get(`/match-referees`),
          api.get(`/referees`),
          api.get(`/venues`),
        ]);

        const matchesData = matchesResponse.data;
        const tournamentsData = tournamentsResponse.data;
        const teamsData = teamsResponse.data;
        const registrationsData = registrationsResponse.data;
        const matchRefereesData = matchRefereesResponse.data;
        const refereesData = refereesResponse.data;
        const venuesData = venuesResponse.data;
        setTournaments(Array.isArray(tournamentsData) ? tournamentsData : []);
        setMatches(Array.isArray(matchesData) ? matchesData : []);
        setTeams(Array.isArray(teamsData) ? teamsData : []);
        setRegistrations(
          Array.isArray(registrationsData) ? registrationsData : [],
        );
        setMatchReferees(
          Array.isArray(matchRefereesData) ? matchRefereesData : [],
        );
        setReferees(Array.isArray(refereesData) ? refereesData : []);
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

  useEffect(() => {
    const appendMatchEvent = (event) => {
      setMatchEvents((prev) => {
        if (!selectedMatch || event.matchId !== selectedMatch.id) return prev;
        if (prev.some((item) => item.id === event.id)) return prev;

        return sortMatchEvents([...prev, event]);
      });
    };

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

    const handleScoreUpdate = ({ matchId, homeScore, awayScore }) => {
      setSelectedMatch((prev) => {
        if (!prev || prev.id !== matchId) return prev;

        return {
          ...prev,
          score: {
            golat_shtepiak: homeScore,
            golat_mysafir: awayScore,
          },
        };
      });

      setScoreForm((prev) => {
        if (!selectedMatch || selectedMatch.id !== matchId) return prev;

        return {
          golat_shtepiak: homeScore,
          golat_mysafir: awayScore,
        };
      });
    };

    const handleMatchEventCreated = (event) => {
      appendMatchEvent(event);
    };

    const handleMatchStatusUpdated = ({ matchId, statusi, status }) => {
      const nextStatus = statusi || status;

      setMatches((prev) =>
        prev.map((match) =>
          match.id === matchId ? { ...match, statusi: nextStatus } : match,
        ),
      );

      setSelectedMatch((prev) =>
        prev && prev.id === matchId ? { ...prev, statusi: nextStatus } : prev,
      );
    };

    socket.on("match_live", handleMatchLive);
    socket.on("match_finished", handleMatchFinished);
    socket.on("score_update", handleScoreUpdate);
    socket.on("score-updated", handleScoreUpdate);
    socket.on("match-event-created", handleMatchEventCreated);
    socket.on("match-status-updated", handleMatchStatusUpdated);
    socket.on("match-finished", handleMatchFinished);

    return () => {
      socket.off("match_live", handleMatchLive);
      socket.off("match_finished", handleMatchFinished);
      socket.off("score_update", handleScoreUpdate);
      socket.off("score-updated", handleScoreUpdate);
      socket.off("match-event-created", handleMatchEventCreated);
      socket.off("match-status-updated", handleMatchStatusUpdated);
      socket.off("match-finished", handleMatchFinished);
    };
  }, [selectedMatch]);

  // Create match handler
  const handleCreate = () => {
    setFormData({
      turneu_id: "",
      ekipi_shtepiak_id: "",
      ekipi_mysafir_id: "",
      data_ndeshjes: "",
      ora_fillimit: "",
      fusha_id: "",
      referi_id: "",
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
      await matchCreateSchema.validate(formData, { abortEarly: false });

      // Convert IDs to integers
      const { referi_id, ...matchPayload } = formData;
      const dataToSend = {
        ...matchPayload,
        turneu_id: parseInt(formData.turneu_id),
        ekipi_shtepiak_id: parseInt(formData.ekipi_shtepiak_id),
        ekipi_mysafir_id: parseInt(formData.ekipi_mysafir_id),
        fusha_id: formData.fusha_id ? parseInt(formData.fusha_id) : null,
      };

      const response = await api.post(`/matches`, dataToSend);

      const newMatch = response.data;
      setMatches([...matches, newMatch]);
      // If a referee was selected, create MatchReferees entry for this match
      if (referi_id) {
        try {
          const mrResponse = await api.post(`/match-referees`, {
            ndeshja_id: newMatch.id,
            gjyqtari_id: parseInt(referi_id),
            roli: "Kryegjyqtar",
          });
          setMatchReferees((prev) => [...prev, mrResponse.data]);
        } catch (e) {
          console.error("Error assigning referee:", e);
        }
      }
      setShowModal(false);
      setFormData({
        turneu_id: "",
        ekipi_shtepiak_id: "",
        ekipi_mysafir_id: "",
        data_ndeshjes: "",
        ora_fillimit: "",
        fusha_id: "",
        referi_id: "",
        statusi: "Planifikuar",
        faza: "",
      });
      setFormErrors({});
      setAlert({ type: "success", message: "Match created successfully!" });
    } catch (err) {
      if (err.inner) {
        const validationErrors = {};
        err.inner.forEach((error) => {
          validationErrors[error.path] = error.message;
        });
        setFormErrors(validationErrors);
      } else {
        console.error("Error creating match:", err);
        const message = err.response?.data?.error || err.message;
        setAlert({
          type: "error",
          message: "Error creating match: " + message,
        });
      }
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
      referi_id: "",
      statusi: "Planifikuar",
      faza: "",
    });
    setFormErrors({});
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
      referi_id: "",
      statusi: "Planifikuar",
      faza: "",
    });
    setFormErrors({});
    setSelectedMatch(null);
    setShowEditModal(false);
  };

  const handleCloseViewModal = () => {
    setSelectedMatch(null);
    setMatchEvents([]);
    setEventForm(initialEventForm);
    setShowViewModal(false);
  };

  const handleCloseDeleteModal = () => {
    setSelectedMatch(null);
    setShowDeleteModal(false);
  };

  // Button handlers
  const handleView = async (id) => {
    const match = matches.find((m) => m.id === id);
    setSelectedMatch(match);
    setMatchEvents([]);
    setEventForm(initialEventForm);
    setScoreForm({
      golat_shtepiak: 0,
      golat_mysafir: 0,
    });

    setShowViewModal(true);

    try {
      const [resultsResponse, eventsResponse] = await Promise.all([
        api.get("/match-results"),
        api.get(`/matches/${id}/events`),
      ]);
      const results = Array.isArray(resultsResponse.data)
        ? resultsResponse.data
        : [];
      const events = Array.isArray(eventsResponse.data)
        ? eventsResponse.data
        : [];
      const existingResult = results.find((result) => result.ndeshja_id === id);

      setMatchEvents(sortMatchEvents(events));

      if (existingResult) {
        setScoreForm({
          golat_shtepiak: existingResult.golat_shtepiak ?? 0,
          golat_mysafir: existingResult.golat_mysafir ?? 0,
        });

        setSelectedMatch((prev) =>
          prev
            ? {
                ...prev,
                score: {
                  golat_shtepiak: existingResult.golat_shtepiak ?? 0,
                  golat_mysafir: existingResult.golat_mysafir ?? 0,
                },
              }
            : prev,
        );
      }
      // fetch primary referee for this match and attach to selectedMatch
      try {
        const mrResp = await api.get(`/match-referees`);
        const mrs = Array.isArray(mrResp.data) ? mrResp.data : [];
        const primary = mrs.find(
          (r) => r.ndeshja_id === id && r.roli === "Kryegjyqtar",
        );
        if (primary) {
          const ref =
            referees.find((r) => r.id === primary.gjyqtari_id) || null;
          setSelectedMatch((prev) =>
            prev ? { ...prev, primary_referee: ref } : prev,
          );
        } else {
          setSelectedMatch((prev) =>
            prev ? { ...prev, primary_referee: null } : prev,
          );
        }
      } catch {
        // ignore referee fetch errors
      }
    } catch (err) {
      setAlert({
        type: "error",
        message:
          "Error fetching match details: " +
          (err.response?.data?.error || err.message),
      });
    }
  };

  const handleEdit = async (id) => {
    const match = matches.find((m) => m.id === id);
    if (!match) return;
    setSelectedMatch(match);
    const primaryReferee = getPrimaryReferee(id);

    setFormData({
      turneu_id: String(match.turneu_id),
      ekipi_shtepiak_id: String(match.ekipi_shtepiak_id),
      ekipi_mysafir_id: String(match.ekipi_mysafir_id),
      data_ndeshjes: formatDateInput(match.data_ndeshjes),
      ora_fillimit: formatTime(match.ora_fillimit),
      fusha_id: match.fusha_id ? String(match.fusha_id) : "",
      referi_id: primaryReferee ? String(primaryReferee.id) : "",
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
      await matchUpdateSchema.validate(formData, { abortEarly: false });

      // Convert IDs to integers
      const { referi_id, ...matchPayload } = formData;
      const dataToSend = {
        ...matchPayload,
        turneu_id: parseInt(formData.turneu_id),
        ekipi_shtepiak_id: parseInt(formData.ekipi_shtepiak_id),
        ekipi_mysafir_id: parseInt(formData.ekipi_mysafir_id),
        fusha_id: formData.fusha_id ? parseInt(formData.fusha_id) : null,
      };

      const response = await api.put(
        `/matches/${selectedMatch.id}`,
        dataToSend,
      );
      const updatedMatch = response.data;
      // Sync primary referee assignment (Kryegjyqtar)
      try {
        const existing = matchReferees.find(
          (r) => r.ndeshja_id === updatedMatch.id && r.roli === "Kryegjyqtar",
        );

        if (referi_id) {
          const gid = parseInt(referi_id);
          if (existing) {
            if (existing.gjyqtari_id !== gid) {
              const updateResp = await api.put(
                `/match-referees/${existing.id}`,
                {
                  ndeshja_id: updatedMatch.id,
                  gjyqtari_id: gid,
                  roli: "Kryegjyqtar",
                },
              );
              setMatchReferees((prev) =>
                prev.map((item) =>
                  item.id === existing.id ? updateResp.data : item,
                ),
              );
            }
          } else {
            const createResp = await api.post(`/match-referees`, {
              ndeshja_id: updatedMatch.id,
              gjyqtari_id: gid,
              roli: "Kryegjyqtar",
            });
            setMatchReferees((prev) => [...prev, createResp.data]);
          }
        } else if (existing) {
          await api.delete(`/match-referees/${existing.id}`);
          setMatchReferees((prev) =>
            prev.filter((item) => item.id !== existing.id),
          );
        }
      } catch (e) {
        console.error("Error syncing referee:", e);
      }
      setMatches(
        matches.map((m) => (m.id === updatedMatch.id ? updatedMatch : m)),
      );
      setShowEditModal(false);
      setSelectedMatch(null);
      setAlert({ type: "success", message: "Match updated successfully!" });
    } catch (err) {
      console.error("Error updating match:", err);
      const message = err.response?.data?.error || err.message;
      setAlert({
        type: "error",
        message: "Error updating match: " + message,
      });
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
      setAlert({
        type: "error",
        message: "Error deleting match: " + err.message,
      });
    }
  };

  const handleScoreInputChange = (e) => {
    const { name, value } = e.target;

    setScoreForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEventInputChange = (e) => {
    const { name, value } = e.target;

    setEventForm((prev) => {
      const next = {
        ...prev,
        [name]: value,
      };

      if (
        name === "lloji" &&
        !teamRequiredEventTypes.includes(value)
      ) {
        next.ekipi_id = "";
      }

      return next;
    });
  };

  const handleScoreSubmit = async (e) => {
    e.preventDefault();

    if (!selectedMatch) return;

    try {
      if (!isLiveMatch(selectedMatch)) {
        setAlert({
          type: "error",
          message: "The match must be live before updating the score.",
        });
        return;
      }

      const response = await api.patch(`/matches/${selectedMatch.id}/score`, {
        golat_shtepiak: Number(scoreForm.golat_shtepiak),
        golat_mysafir: Number(scoreForm.golat_mysafir),
      });

      const result = response.data.result;

      const nextScore = {
        golat_shtepiak: result.golat_shtepiak ?? 0,
        golat_mysafir: result.golat_mysafir ?? 0,
      };

      setScoreForm(nextScore);

      setSelectedMatch((prev) =>
        prev
          ? {
              ...prev,
              score: nextScore,
            }
          : prev,
      );

      setAlert({
        type: "success",
        message: "Score updated successfully!",
      });
    } catch (err) {
      setAlert({
        type: "error",
        message:
          "Error updating score: " + (err.response?.data?.error || err.message),
      });
    }
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();

    if (!selectedMatch) return;

    try {
      if (!isLiveMatch(selectedMatch)) {
        setAlert({
          type: "error",
          message: "The match must be live before adding events.",
        });
        return;
      }

      const requiresTeam = teamRequiredEventTypes.includes(eventForm.lloji);
      if (requiresTeam && !eventForm.ekipi_id) {
        setAlert({
          type: "error",
          message: "Please select a team for this event.",
        });
        return;
      }

      const response = await api.post(`/matches/${selectedMatch.id}/events`, {
        lloji: eventForm.lloji,
        ekipi_id: eventForm.ekipi_id ? Number(eventForm.ekipi_id) : null,
      });

      const createdEvent = response.data.event;
      if (createdEvent) {
        setMatchEvents((prev) => {
          if (prev.some((item) => item.id === createdEvent.id)) return prev;
          return sortMatchEvents([...prev, createdEvent]);
        });
      }

      if (response.data.score) {
        const nextScore = {
          golat_shtepiak: response.data.score.golat_shtepiak ?? 0,
          golat_mysafir: response.data.score.golat_mysafir ?? 0,
        };

        setScoreForm(nextScore);
        setSelectedMatch((prev) =>
          prev
            ? {
                ...prev,
                score: nextScore,
              }
            : prev,
        );
      }

      setEventForm(initialEventForm);
      setAlert({ type: "success", message: "Match event added successfully!" });
    } catch (err) {
      setAlert({
        type: "error",
        message:
          "Error adding match event: " +
          (err.response?.data?.error || err.message),
      });
    }
  };

  const applyMatchStatus = (matchId, statusi) => {
    setMatches((prev) =>
      prev.map((match) =>
        match.id === matchId ? { ...match, statusi } : match,
      ),
    );

    setSelectedMatch((prev) =>
      prev && prev.id === matchId ? { ...prev, statusi } : prev,
    );
  };

  const handleStatusUpdate = async (statusi) => {
    if (!selectedMatch) return;

    try {
      const response = await api.patch(`/matches/${selectedMatch.id}/status`, {
        statusi,
      });
      const nextStatus = response.data.match?.statusi || statusi;

      applyMatchStatus(selectedMatch.id, nextStatus);
      setAlert({ type: "success", message: "Match status updated successfully!" });
    } catch (err) {
      setAlert({
        type: "error",
        message:
          "Error updating match status: " +
          (err.response?.data?.error || err.message),
      });
    }
  };

  const handleFinishMatch = async () => {
    if (!selectedMatch) return;

    try {
      const response = await api.post(`/matches/${selectedMatch.id}/finish`);
      const result = response.data.result;
      const nextStatus = response.data.match?.statusi || "PÃ«rfunduar";

      applyMatchStatus(selectedMatch.id, nextStatus);

      if (result) {
        const nextScore = {
          golat_shtepiak: result.golat_shtepiak ?? 0,
          golat_mysafir: result.golat_mysafir ?? 0,
        };

        setScoreForm(nextScore);
        setSelectedMatch((prev) =>
          prev
            ? {
                ...prev,
                score: nextScore,
                winnerTeamId: response.data.winnerTeamId ?? null,
              }
            : prev,
        );
      }

      setAlert({ type: "success", message: "Match finished successfully!" });
    } catch (err) {
      setAlert({
        type: "error",
        message:
          "Error finishing match: " +
          (err.response?.data?.error || err.message),
      });
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

  const getPrimaryReferee = (matchId) => {
    const assignment = matchReferees.find(
      (item) => item.ndeshja_id === matchId && item.roli === "Kryegjyqtar",
    );

    if (!assignment) return null;

    return referees.find((item) => item.id === assignment.gjyqtari_id) || null;
  };

  const getPrimaryRefereeName = (matchId) => {
    const referee = getPrimaryReferee(matchId);
    if (!referee) return "N/A";

    return (
      `${referee.emri || ""} ${referee.mbiemri || ""}`.trim() ||
      referee.emertimi ||
      "N/A"
    );
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

  // Renders skeleton placeholders while initial API requests are in flight.
  if (loading) {
    return (
      <div className="delay-skeleton">
        <TableSkeleton />
      </div>
    )
  }

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
                <th className="px-4 py-3 text-left font-semibold">Referee</th>
                <th className="px-4 py-3 text-center font-semibold">Timer</th>
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
                      {formatTime(m.ora_fillimit) || "N/A"}
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
                    <td className="px-4 py-3">{getPrimaryRefereeName(m.id)}</td>
                    <td className="px-4 py-3 text-center">
                      <MatchTimer match={m} />
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
                          <Edit size={16} />
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
                    colSpan="9"
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
                      className={`w-full px-4 py-2 border ${formErrors.turneu_id ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500`}
                      required
                    >
                      <option value="">Select Tournament</option>
                      {tournaments.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.emertimi}
                        </option>
                      ))}
                    </select>
                    {formErrors.turneu_id && <p className="text-sm text-red-500 mt-1">{formErrors.turneu_id}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Home Team *
                    </label>
                    <select
                      name="ekipi_shtepiak_id"
                      value={formData.ekipi_shtepiak_id}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border ${formErrors.ekipi_shtepiak_id ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500`}
                      required
                    >
                      <option value="">Select Home Team</option>
                      {availableTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.emertimi}
                        </option>
                      ))}
                    </select>
                    {formErrors.ekipi_shtepiak_id && <p className="text-sm text-red-500 mt-1">{formErrors.ekipi_shtepiak_id}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Away Team *
                    </label>
                    <select
                      name="ekipi_mysafir_id"
                      value={formData.ekipi_mysafir_id}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border ${formErrors.ekipi_mysafir_id ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500`}
                      required
                    >
                      <option value="">Select Away Team</option>
                      {availableTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.emertimi}
                        </option>
                      ))}
                    </select>
                    {formErrors.ekipi_mysafir_id && <p className="text-sm text-red-500 mt-1">{formErrors.ekipi_mysafir_id}</p>}
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
                      className={`w-full px-4 py-2 border ${formErrors.data_ndeshjes ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500`}
                      required
                    />
                    {formErrors.data_ndeshjes && <p className="text-sm text-red-500 mt-1">{formErrors.data_ndeshjes}</p>}
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
                      className={`w-full px-4 py-2 border ${formErrors.ora_fillimit ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500`}
                    />
                    {formErrors.ora_fillimit && <p className="text-sm text-red-500 mt-1">{formErrors.ora_fillimit}</p>}
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
                      Referee
                    </label>
                    <select
                      name="referi_id"
                      value={formData.referi_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select Referee</option>
                      {referees.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.emri} {r.mbiemri}
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
                    {formatTime(selectedMatch.ora_fillimit) || "N/A"}
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
                    Referee
                  </label>
                  <p className="text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {getPrimaryRefereeName(selectedMatch.id)}
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
              <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                <h4 className="mb-4 text-lg font-semibold text-gray-800">
                  Match Status Controls
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate("Live")}
                    disabled={isLiveMatch(selectedMatch) || isFinishedMatch(selectedMatch)}
                    className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    {isHalfTimeMatch(selectedMatch) ? "Resume Match" : "Start Match"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate("HalfTime")}
                    disabled={!isLiveMatch(selectedMatch)}
                    className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    Half Time
                  </button>
                  <button
                    type="button"
                    onClick={handleFinishMatch}
                    disabled={!isLiveMatch(selectedMatch) && !isHalfTimeMatch(selectedMatch)}
                    className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    Finish Match
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate("Anuluar")}
                    disabled={isFinishedMatch(selectedMatch)}
                    className="rounded-lg bg-slate-600 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    Cancel Match
                  </button>
                </div>
              </div>
              <form
                onSubmit={handleScoreSubmit}
                className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <h4 className="mb-4 text-lg font-semibold text-gray-800">
                  Update Live Score
                </h4>
                {!isLiveMatch(selectedMatch) && (
                  <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    The match must be live before score or event updates are allowed.
                  </p>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Home Score
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="golat_shtepiak"
                      value={scoreForm.golat_shtepiak}
                      onChange={handleScoreInputChange}
                      disabled={!isLiveMatch(selectedMatch)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Away Score
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="golat_mysafir"
                      value={scoreForm.golat_mysafir}
                      onChange={handleScoreInputChange}
                      disabled={!isLiveMatch(selectedMatch)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!isLiveMatch(selectedMatch)}
                  className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  Update Score
                </button>
              </form>
              <form
                onSubmit={handleEventSubmit}
                className="mt-6 rounded-lg border border-gray-200 bg-white p-4"
              >
                <h4 className="mb-4 text-lg font-semibold text-gray-800">
                  Add Match Event
                </h4>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event Type
                    </label>
                    <select
                      name="lloji"
                      value={eventForm.lloji}
                      onChange={handleEventInputChange}
                      disabled={!isLiveMatch(selectedMatch)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Goal">Goal</option>
                      <option value="YellowCard">Yellow card</option>
                      <option value="RedCard">Red card</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team
                    </label>
                    <select
                      name="ekipi_id"
                      value={eventForm.ekipi_id}
                      onChange={handleEventInputChange}
                      disabled={
                        !isLiveMatch(selectedMatch) ||
                        !teamRequiredEventTypes.includes(eventForm.lloji)
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">No team</option>
                      <option value={selectedMatch.ekipi_shtepiak_id}>
                        {getTeamName(selectedMatch.ekipi_shtepiak_id)}
                      </option>
                      <option value={selectedMatch.ekipi_mysafir_id}>
                        {getTeamName(selectedMatch.ekipi_mysafir_id)}
                      </option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!isLiveMatch(selectedMatch)}
                  className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  Add Event
                </button>
              </form>

              <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h4 className="mb-4 text-lg font-semibold text-gray-800">
                  Match Timeline
                </h4>

                {matchEvents.length > 0 ? (
                  <div className="space-y-2">
                    {matchEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3"
                      >
                        <span className="font-semibold text-gray-900">
                          {getEventMinute(event)} - {getEventTypeLabel(event.eventType)}
                        </span>
                        <span className="text-sm text-gray-600">
                          {event.playerName || "No player"}
                          {event.teamName ? ` - ${event.teamName}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No match events yet.
                  </p>
                )}
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
                      Referee
                    </label>
                    <select
                      name="referi_id"
                      value={formData.referi_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select Referee</option>
                      {referees.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.emri} {r.mbiemri}
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
