import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  CalendarDays,
  CircleDot,
  Clock3,
  Edit2,
  ExternalLink,
  Radio,
  RefreshCcw,
  Save,
  Shield,
  Trash2,
  Trophy,
  Wifi,
  X,
} from "lucide-react";
import { FaFutbol } from "react-icons/fa";
import api from "../../config/axiosInstance";
import socket from "../../socket";
import { Alert } from "../../components/Alert";
import CardSkeleton from "../../components/Skeletons/CardSkeleton";
import AuthContext from "../../context/AuthContext";
import { useMatchTimer } from "../../hooks/useMatchTimer";

const DEFAULT_MATCH_DURATION_MINUTES = 60;
const initialEventDetails = {
  lojtari_id: "",
  player_name: "",
  description: "",
  minuta: "",
};
const pageShell =
  "w-full bg-gray-100 text-gray-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100";
const panel =
  "rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800";
const mutedText = "text-gray-500 dark:text-slate-400";
const strongText = "text-gray-900 dark:text-slate-200";

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-GB");
}

function formatTime(value) {
  if (!value) return "N/A";

  const text = String(value);
  if (text.includes("T")) return text.slice(11, 16);

  return text.slice(0, 5);
}

function isLive(match) {
  return match?.statusi === "Live";
}

function isHalfTime(match) {
  return match?.statusi === "HalfTime";
}

function isFinished(match) {
  const status = String(match?.statusi || "").toLowerCase();
  return (
    status.includes("rfunduar") ||
    status.includes("finished") ||
    status.includes("final")
  );
}

function getEventType(event) {
  return event.eventType || event.card || "Event";
}

function isGoalEventType(type) {
  return type === "Goal" || type === "Gol";
}

function isYellowCardEventType(type) {
  return type === "YellowCard" || type === "E verdhe";
}

function isRedCardEventType(type) {
  return type === "RedCard" || type === "E kuqe";
}

function getEventMinute(event) {
  return event.minute ?? event.minuta;
}

function getEventPerson(event) {
  return event.playerName || event.player_name || "";
}

function getEventLabel(type) {
  const labels = {
    Goal: "Goal",
    Gol: "Goal",
    YellowCard: "Yellow Card",
    RedCard: "Red Card",
    "E verdhe": "Yellow Card",
    "E kuqe": "Red Card",
  };

  return labels[type] || type || "Event";
}

function getEventClasses(type) {
  if (isGoalEventType(type)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (type === "RedCard" || type === "E kuqe") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300";
  }

  if (type === "YellowCard" || type === "E verdhe") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
  }

  return "border-gray-200 bg-gray-50 text-gray-700 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-300";
}

function getTimelineEvents(match) {
  return [...(match?.cards || []), ...(match?.events || [])].sort((a, b) => {
    const minuteA = Number(getEventMinute(a));
    const minuteB = Number(getEventMinute(b));
    const safeMinuteA = Number.isFinite(minuteA)
      ? minuteA
      : Number.MAX_SAFE_INTEGER;
    const safeMinuteB = Number.isFinite(minuteB)
      ? minuteB
      : Number.MAX_SAFE_INTEGER;

    if (safeMinuteA !== safeMinuteB) return safeMinuteB - safeMinuteA;
    return Number(b.id || 0) - Number(a.id || 0);
  });
}

function getTimelineEventsAscending(match) {
  return [...(match?.cards || []), ...(match?.events || [])].sort((a, b) => {
    const minuteA = Number(getEventMinute(a));
    const minuteB = Number(getEventMinute(b));
    const safeMinuteA = Number.isFinite(minuteA)
      ? minuteA
      : Number.MAX_SAFE_INTEGER;
    const safeMinuteB = Number.isFinite(minuteB)
      ? minuteB
      : Number.MAX_SAFE_INTEGER;

    if (safeMinuteA !== safeMinuteB) return safeMinuteA - safeMinuteB;
    return Number(a.id || 0) - Number(b.id || 0);
  });
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getEventTeamSide(event, match) {
  const eventTeamId = Number(
    event.teamId ?? event.team_id ?? event.ekipi_id ?? event.ekipiId,
  );
  const homeTeamId = Number(match?.ekipi_shtepiak_id);
  const awayTeamId = Number(match?.ekipi_mysafir_id);

  if (Number.isFinite(eventTeamId)) {
    if (eventTeamId === homeTeamId) return "home";
    if (eventTeamId === awayTeamId) return "away";
  }

  const teamName = normalizeText(event.teamName || event.team_name);
  if (teamName) {
    if (teamName === normalizeText(match?.ekipi_shtepiak)) return "home";
    if (teamName === normalizeText(match?.ekipi_mysafir)) return "away";
  }

  return "home";
}

function getOrdinal(value) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}TH`;

  const mod10 = value % 10;
  if (mod10 === 1) return `${value}ST`;
  if (mod10 === 2) return `${value}ND`;
  if (mod10 === 3) return `${value}RD`;

  return `${value}TH`;
}

function getPeriodConfig(match) {
  const timing = match?.sport_timing || {};
  const duration = Number(match?.kohezgjatja ?? timing.kohezgjatja_default);
  const periods = Number(timing.numri_periodave);

  return {
    duration:
      Number.isFinite(duration) && duration > 0
        ? duration
        : DEFAULT_MATCH_DURATION_MINUTES,
    periods: Number.isInteger(periods) && periods > 0 ? periods : 2,
    label: timing.emri_periodave || "Half",
  };
}

function getMatchReportSections(match) {
  const { duration, periods, label } = getPeriodConfig(match);
  const periodLength = Math.max(1, duration / periods);
  let homeScore = 0;
  let awayScore = 0;
  const sections = Array.from({ length: periods }, (_, index) => ({
    key: `period-${index + 1}`,
    label: `${getOrdinal(index + 1)} ${label}`.toUpperCase(),
    score: "0 - 0",
    events: [],
  }));

  getTimelineEventsAscending(match).forEach((event) => {
    const type = getEventType(event);
    const side = getEventTeamSide(event, match);

    if (isGoalEventType(type)) {
      if (side === "away") {
        awayScore += 1;
      } else {
        homeScore += 1;
      }
    }

    const reportEvent = {
      event,
      type,
      side,
      scoreLabel: isGoalEventType(type) ? `${homeScore} - ${awayScore}` : "",
    };
    const minute = Number(getEventMinute(event));
    const periodIndex =
      Number.isFinite(minute) && minute > 0
        ? Math.min(periods - 1, Math.floor((minute - 1) / periodLength))
        : 0;
    const section = sections[periodIndex];

    section.events.push(reportEvent);
    sections.forEach((item, index) => {
      if (index >= periodIndex) {
        item.score = `${homeScore} - ${awayScore}`;
      }
    });
  });

  return sections;
}

function getInitials(value) {
  const text = value || "Team";
  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getScore(match) {
  return {
    home: match?.score?.golat_shtepiak ?? 0,
    away: match?.score?.golat_mysafir ?? 0,
  };
}

function formatMinute(minute) {
  const parsed = Number(minute);
  if (!Number.isFinite(parsed) || parsed < 0) return "--";
  return `${parsed}'`;
}

function EventIcon({ type, size = 18 }) {
  if (isGoalEventType(type)) {
    return <FaFutbol size={size} aria-hidden="true" />;
  }

  if (isYellowCardEventType(type)) {
    return (
      <span
        className="block h-5 w-3.5 rounded-sm border border-amber-500 bg-amber-300 shadow-sm"
        aria-hidden="true"
      />
    );
  }

  if (isRedCardEventType(type)) {
    return (
      <span
        className="block h-5 w-3.5 rounded-sm border border-red-600 bg-red-500 shadow-sm"
        aria-hidden="true"
      />
    );
  }

  return <CircleDot size={size} aria-hidden="true" />;
}

function EmptyEventsState({ title, description }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500 dark:border-slate-700 dark:text-slate-400">
      <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl border border-gray-200 bg-gray-50 text-gray-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-500">
        <FaFutbol size={20} aria-hidden="true" />
      </div>
      <p className={`font-bold ${strongText}`}>{title}</p>
      <p className={`mt-1 text-sm ${mutedText}`}>{description}</p>
    </div>
  );
}

function getPlayerTeamId(player) {
  return player?.team_id ?? player?.ekipiId ?? player?.teamId ?? null;
}

function getPlayerNameOption(player) {
  const name = [player?.emri, player?.mbiemri].filter(Boolean).join(" ");
  const number = player?.numri ? `#${player.numri} ` : "";

  return `${number}${name || "Unnamed player"}`;
}

function getPlayersForTeam(players, teamId) {
  const parsedTeamId = Number(teamId);
  if (!Number.isInteger(parsedTeamId)) return [];

  return players.filter((player) => Number(getPlayerTeamId(player)) === parsedTeamId);
}

function hasSelectedPlayerForTeam(details, teamId, players) {
  const parsedTeamId = Number(teamId);
  const selectedPlayerId = Number(details.lojtari_id);

  if (!Number.isInteger(parsedTeamId) || !Number.isInteger(selectedPlayerId)) {
    return false;
  }

  return players.some(
    (player) =>
      Number(player.id) === selectedPlayerId &&
      Number(getPlayerTeamId(player)) === parsedTeamId,
  );
}

function normalizeEventDetails(details, teamId, players) {
  const selectedPlayerId = Number(details.lojtari_id);
  const selectedPlayer = players.find(
    (player) => Number(player.id) === selectedPlayerId,
  );
  const selectedPlayerBelongsToTeam =
    selectedPlayer && Number(getPlayerTeamId(selectedPlayer)) === Number(teamId);

  return {
    ...(selectedPlayerBelongsToTeam && {
      lojtari_id: selectedPlayerId,
    }),
    ...(details.player_name.trim() && {
      player_name: details.player_name.trim(),
    }),
    ...(details.description.trim() && {
      description: details.description.trim(),
    }),
    ...(details.minuta !== "" && {
      minuta: Number(details.minuta),
    }),
  };
}

function getEventEditForm(event) {
  return {
    lloji: getEventType(event),
    ekipi_id: event.teamId ? String(event.teamId) : "",
    lojtari_id: event.playerId ? String(event.playerId) : "",
    player_name: event.playerId ? "" : getEventPerson(event),
    description: event.description || "",
    minuta:
      getEventMinute(event) === null || getEventMinute(event) === undefined
        ? ""
        : String(getEventMinute(event)),
  };
}

function TeamBadge({ name, side }) {
  const tone =
    side === "home"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";

  return (
    <div
      className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-sm font-black ${tone}`}
    >
      {getInitials(name)}
    </div>
  );
}

function StatusBadge({ match }) {
  if (isLive(match)) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
        <Radio size={14} />
        LIVE
      </span>
    );
  }

  if (isHalfTime(match)) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        <Clock3 size={14} />
        HALF TIME
      </span>
    );
  }

  if (isFinished(match)) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
        <Trophy size={14} />
        FINAL
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-700 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
      <CircleDot size={14} />
      {match?.statusi || "Scheduled"}
    </span>
  );
}

function ClockBadge({ match }) {
  const { display, minutes } = useMatchTimer(match);

  if (isHalfTime(match)) {
    return <span className="text-emerald-600 dark:text-emerald-300">HT</span>;
  }

  if (isFinished(match)) {
    return <span className="text-emerald-600 dark:text-emerald-300">FT</span>;
  }

  if (!isLive(match)) {
    return <span className="text-gray-400 dark:text-slate-500">--</span>;
  }

  return (
    <span className="text-emerald-600 dark:text-emerald-300">
      {minutes}
      <span className="text-lg">'</span>
      <span className="ml-2 text-sm font-semibold text-gray-500 dark:text-slate-400">
        {display}
      </span>
    </span>
  );
}

function StatRow({ label, value, tone, width, icon }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className={`inline-flex items-center gap-2 ${mutedText}`}>
          {icon}
          {label}
        </span>
        <span className={`font-bold ${strongText}`}>{value}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700">
        <div className={`h-2 rounded-full ${tone}`} style={{ width }} />
      </div>
    </div>
  );
}

function LiveMatches() {
  const { user } = useContext(AuthContext);
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [savingAction, setSavingAction] = useState("");
  const [players, setPlayers] = useState([]);
  const [eventDetails, setEventDetails] = useState(initialEventDetails);
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventEditForm, setEventEditForm] = useState(null);

  const canManageLive =
    user?.is_admin || user?.is_organizer || user?.is_referee;

  const selectedMatch = useMemo(() => {
    if (matches.length === 0) return null;
    return matches.find((match) => match.id === selectedMatchId) || matches[0];
  }, [matches, selectedMatchId]);

  const selectedEvents = useMemo(
    () => getTimelineEvents(selectedMatch),
    [selectedMatch],
  );
  const matchReportSections = useMemo(
    () => getMatchReportSections(selectedMatch),
    [selectedMatch],
  );

  const score = getScore(selectedMatch);
  const homePlayers = useMemo(
    () => getPlayersForTeam(players, selectedMatch?.ekipi_shtepiak_id),
    [players, selectedMatch?.ekipi_shtepiak_id],
  );
  const awayPlayers = useMemo(
    () => getPlayersForTeam(players, selectedMatch?.ekipi_mysafir_id),
    [players, selectedMatch?.ekipi_mysafir_id],
  );
  const homePlayerSelected = hasSelectedPlayerForTeam(
    eventDetails,
    selectedMatch?.ekipi_shtepiak_id,
    players,
  );
  const awayPlayerSelected = hasSelectedPlayerForTeam(
    eventDetails,
    selectedMatch?.ekipi_mysafir_id,
    players,
  );

  const liveSummary = useMemo(() => {
    const events = getTimelineEvents(selectedMatch);
    const goals = events.filter((event) =>
      isGoalEventType(getEventType(event)),
    ).length;
    const yellowCards = events.filter((event) =>
      ["YellowCard", "E verdhe"].includes(getEventType(event)),
    ).length;
    const redCards = events.filter((event) =>
      ["RedCard", "E kuqe"].includes(getEventType(event)),
    ).length;

    return { goals, yellowCards, redCards };
  }, [selectedMatch]);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const response = await api.get("/matches/public/live");
      const nextMatches = Array.isArray(response.data) ? response.data : [];

      setMatches(nextMatches);
      setSelectedMatchId((current) => current || nextMatches[0]?.id || null);
    } catch (err) {
      setAlert({
        type: "error",
        message:
          "Error loading live matches: " +
          (err.response?.data?.error || err.message),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  useEffect(() => {
    if (!canManageLive) {
      setPlayers([]);
      return;
    }

    const loadPlayers = async () => {
      try {
        const response = await api.get("/players");
        setPlayers(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setAlert({
          type: "error",
          message:
            "Error loading players: " +
            (err.response?.data?.error || err.message),
        });
      }
    };

    loadPlayers();
  }, [canManageLive]);

  useEffect(() => {
    const updateMatch = (matchId, updater) => {
      setMatches((prev) =>
        prev.map((match) =>
          match.id === matchId ? updater(match) : match,
        ),
      );
    };

    const handleMatchLive = ({ matchId }) => {
      updateMatch(matchId, (match) => ({ ...match, statusi: "Live" }));
    };

    const handleMatchFinished = ({ matchId, homeScore, awayScore }) => {
      updateMatch(matchId, (match) => ({
        ...match,
        statusi: "Përfunduar",
        ...(homeScore !== undefined &&
          awayScore !== undefined && {
            score: {
              golat_shtepiak: homeScore,
              golat_mysafir: awayScore,
            },
          }),
      }));
    };

    const handleMatchStatusUpdated = ({ matchId, statusi, status }) => {
      const nextStatus = statusi || status;
      updateMatch(matchId, (match) => ({ ...match, statusi: nextStatus }));
    };

    const handleScoreUpdate = ({ matchId, homeScore, awayScore }) => {
      updateMatch(matchId, (match) => ({
        ...match,
        score: {
          golat_shtepiak: homeScore,
          golat_mysafir: awayScore,
        },
      }));
    };

    const appendEvent = (event) => {
      updateMatch(event.matchId, (match) => {
        const cards = match.cards || [];
        if (cards.some((item) => item.id === event.id)) return match;

        const events = match.events || [];
        if (events.some((item) => item.id === event.id)) return match;

        return {
          ...match,
          events: [...events, event],
        };
      });
    };

    const updateEvent = (event) => {
      updateMatch(event.matchId, (match) => {
        const cards = match.cards || [];
        const events = match.events || [];
        const cardExists = cards.some((item) => item.id === event.id);
        const eventExists = events.some((item) => item.id === event.id);

        if (!cardExists && !eventExists) {
          return {
            ...match,
            events: [...events, event],
          };
        }

        return {
          ...match,
          cards: cards.map((item) => (item.id === event.id ? event : item)),
          events: events.map((item) => (item.id === event.id ? event : item)),
        };
      });
    };

    const deleteEvent = ({ matchId, eventId }) => {
      updateMatch(matchId, (match) => ({
        ...match,
        cards: (match.cards || []).filter((event) => event.id !== eventId),
        events: (match.events || []).filter((event) => event.id !== eventId),
      }));
    };

    const handleCardEvent = (event) => {
      appendEvent({
        id: event.eventId,
        matchId: event.matchId,
        playerId: event.playerId,
        playerName: event.playerName,
        teamId: event.teamId,
        teamName: event.teamName,
        eventType: event.card,
        minute: event.minuta,
      });
    };

    socket.on("match_live", handleMatchLive);
    socket.on("match_finished", handleMatchFinished);
    socket.on("match-finished", handleMatchFinished);
    socket.on("match-status-updated", handleMatchStatusUpdated);
    socket.on("score_update", handleScoreUpdate);
    socket.on("score-updated", handleScoreUpdate);
    socket.on("card_event", handleCardEvent);
    socket.on("match-event-created", appendEvent);
    socket.on("match-event-updated", updateEvent);
    socket.on("match-event-deleted", deleteEvent);

    return () => {
      socket.off("match_live", handleMatchLive);
      socket.off("match_finished", handleMatchFinished);
      socket.off("match-finished", handleMatchFinished);
      socket.off("match-status-updated", handleMatchStatusUpdated);
      socket.off("score_update", handleScoreUpdate);
      socket.off("score-updated", handleScoreUpdate);
      socket.off("card_event", handleCardEvent);
      socket.off("match-event-created", appendEvent);
      socket.off("match-event-updated", updateEvent);
      socket.off("match-event-deleted", deleteEvent);
    };
  }, []);

  const applyMatchPatch = (matchId, patch) => {
    setMatches((prev) =>
      prev.map((match) =>
        match.id === matchId ? { ...match, ...patch } : match,
      ),
    );
  };

  const applyScorePatch = (matchId, scorePayload) => {
    if (!scorePayload) return;

    applyMatchPatch(matchId, {
      score: {
        golat_shtepiak: scorePayload.golat_shtepiak ?? 0,
        golat_mysafir: scorePayload.golat_mysafir ?? 0,
      },
    });
  };

  const replaceEventInState = (nextEvent) => {
    setMatches((prev) =>
      prev.map((match) => {
        if (match.id !== nextEvent.matchId) return match;

        return {
          ...match,
          cards: (match.cards || []).map((event) =>
            event.id === nextEvent.id ? nextEvent : event,
          ),
          events: (match.events || []).map((event) =>
            event.id === nextEvent.id ? nextEvent : event,
          ),
        };
      }),
    );
  };

  const removeEventFromState = (matchId, eventId) => {
    setMatches((prev) =>
      prev.map((match) =>
        match.id === matchId
          ? {
              ...match,
              cards: (match.cards || []).filter((event) => event.id !== eventId),
              events: (match.events || []).filter(
                (event) => event.id !== eventId,
              ),
            }
          : match,
      ),
    );
  };

  const handleEventDetailChange = (event) => {
    const { name, value } = event.target;

    setEventDetails((current) => ({
      ...current,
      [name]: value,
      ...(name === "lojtari_id" && value ? { player_name: "" } : {}),
    }));
  };

  const handleCreateEvent = async (lloji, teamId) => {
    if (!selectedMatch) return;

    if (!hasSelectedPlayerForTeam(eventDetails, teamId, players)) {
      setAlert({
        type: "error",
        message: "Select a player before adding a goal or card.",
      });
      return;
    }

    try {
      setSavingAction(`${lloji}-${teamId}`);
      const response = await api.post(`/matches/${selectedMatch.id}/events`, {
        lloji,
        ekipi_id: teamId,
        ...normalizeEventDetails(eventDetails, teamId, players),
      });

      if (response.data.event) {
        setMatches((prev) =>
          prev.map((match) => {
            if (match.id !== selectedMatch.id) return match;

            const events = match.events || [];
            if (events.some((event) => event.id === response.data.event.id)) {
              return match;
            }

            return {
              ...match,
              events: [...events, response.data.event],
            };
          }),
        );
      }

      if (response.data.score) {
        applyScorePatch(selectedMatch.id, response.data.score);
      }

      setEventDetails(initialEventDetails);
    } catch (err) {
      setAlert({
        type: "error",
        message:
          "Error adding event: " +
          (err.response?.data?.error || err.message),
      });
    } finally {
      setSavingAction("");
    }
  };

  const beginEditEvent = (event) => {
    setEditingEventId(event.id);
    setEventEditForm(getEventEditForm(event));
  };

  const cancelEditEvent = () => {
    setEditingEventId(null);
    setEventEditForm(null);
  };

  const handleEventEditChange = (event) => {
    const { name, value } = event.target;

    setEventEditForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "ekipi_id" ? { lojtari_id: "" } : {}),
      ...(name === "lojtari_id" && value ? { player_name: "" } : {}),
    }));
  };

  const handleUpdateEvent = async (event) => {
    if (!eventEditForm) return;

    if (!eventEditForm.lojtari_id) {
      setAlert({
        type: "error",
        message: "Select a player before saving this event.",
      });
      return;
    }

    try {
      setSavingAction(`update-${event.id}`);
      const response = await api.put(`/match-events/${event.id}`, {
        lloji: eventEditForm.lloji,
        ekipi_id: eventEditForm.ekipi_id ? Number(eventEditForm.ekipi_id) : null,
        lojtari_id: eventEditForm.lojtari_id
          ? Number(eventEditForm.lojtari_id)
          : null,
        player_name: eventEditForm.player_name,
        description: eventEditForm.description,
        minuta:
          eventEditForm.minuta === "" ? null : Number(eventEditForm.minuta),
      });

      if (response.data.event) {
        replaceEventInState(response.data.event);
      }

      applyScorePatch(event.matchId, response.data.score);
      cancelEditEvent();
    } catch (err) {
      setAlert({
        type: "error",
        message:
          "Error updating event: " +
          (err.response?.data?.error || err.message),
      });
    } finally {
      setSavingAction("");
    }
  };

  const handleDeleteEvent = async (event) => {
    const confirmed = window.confirm("Delete this match event?");
    if (!confirmed) return;

    try {
      setSavingAction(`delete-${event.id}`);
      const response = await api.delete(`/match-events/${event.id}`);
      removeEventFromState(event.matchId, event.id);
      applyScorePatch(event.matchId, response.data.score);
    } catch (err) {
      setAlert({
        type: "error",
        message:
          "Error deleting event: " +
          (err.response?.data?.error || err.message),
      });
    } finally {
      setSavingAction("");
    }
  };

  const ActionButton = ({
    children,
    icon,
    onClick,
    disabled,
    tone = "slate",
  }) => {
    const tones = {
      green:
        "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20",
      amber:
        "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20",
      red: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20",
      blue: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20",
      slate:
        "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
    };

    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || Boolean(savingAction)}
        className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:border-slate-700 dark:disabled:bg-slate-800/50 dark:disabled:text-slate-500 ${tones[tone]}`}
      >
        {icon}
        {children}
      </button>
    );
  };

  if (loading) {
    return (
      <main className={pageShell}>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-0">
          <CardSkeleton />
        </div>
      </main>
    );
  }

  if (!selectedMatch) {
    return (
      <main className={pageShell}>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-0">
          <div className={`${panel} p-8`}>
            <h1 className={`text-2xl font-bold ${strongText}`}>
              Live Match Center
            </h1>
            <p className={`mt-2 ${mutedText}`}>
              No live or recent matches found.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={pageShell}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-0">
        {alert && (
          <div className="mb-4">
            <Alert
              type={alert.type}
              message={alert.message}
              onClose={() => setAlert(null)}
            />
          </div>
        )}

        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
              Live Match Center
            </p>
            <h1 className={`mt-1 text-3xl font-bold ${strongText}`}>
              {selectedMatch.turneu_emri || "Tournament"}
            </h1>
            <p className={`mt-1 text-sm ${mutedText}`}>
              {selectedMatch.faza || "Match"} overview and live event updates.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              <Wifi size={16} />
              Connected
            </span>
            <button
              type="button"
              onClick={loadMatches}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <RefreshCcw size={15} />
              Refresh
            </button>
            <Link
              to={`/live-matches/${selectedMatch.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
            >
              <ExternalLink size={15} />
              Public view
            </Link>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-6">
            <div className={`${panel} overflow-hidden`}>
              <div className="border-b border-gray-100 px-5 py-4 dark:border-slate-700 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className={`text-lg font-bold ${strongText}`}>
                      Scoreboard
                    </h2>
                    <p className={`text-sm ${mutedText}`}>
                      {formatDate(selectedMatch.data_ndeshjes)} at{" "}
                      {formatTime(selectedMatch.ora_fillimit)}
                    </p>
                  </div>
                  <StatusBadge match={selectedMatch} />
                </div>
              </div>

              <div className="grid items-center gap-5 p-5 sm:p-6 md:grid-cols-[1fr_auto_1fr]">
                <div className="flex min-w-0 items-center gap-4 md:justify-end md:text-right">
                  <TeamBadge
                    name={selectedMatch.ekipi_shtepiak}
                    side="home"
                  />
                  <div className="min-w-0">
                    <p className={`truncate text-xl font-black ${strongText}`}>
                      {selectedMatch.ekipi_shtepiak || "Home Team"}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase text-blue-600 dark:text-blue-400">
                      Home
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-4 text-center dark:border-slate-700 dark:bg-slate-900/60">
                  <div className={`text-5xl font-black ${strongText}`}>
                    {score.home} - {score.away}
                  </div>
                  <div className="mt-2 text-2xl font-black">
                    <ClockBadge match={selectedMatch} />
                  </div>
                  {isFinished(selectedMatch) && (
                    <p className="mt-1 text-xs font-bold uppercase text-emerald-600 dark:text-emerald-300">
                      Final score
                    </p>
                  )}
                </div>

                <div className="flex min-w-0 items-center gap-4 md:flex-row-reverse md:justify-end">
                  <TeamBadge
                    name={selectedMatch.ekipi_mysafir}
                    side="away"
                  />
                  <div className="min-w-0 md:text-left">
                    <p className={`truncate text-xl font-black ${strongText}`}>
                      {selectedMatch.ekipi_mysafir || "Away Team"}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
                      Away
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400 sm:grid-cols-2 sm:px-6 xl:grid-cols-4">
                <div className="inline-flex items-center gap-2">
                  <CalendarDays size={16} />
                  {formatDate(selectedMatch.data_ndeshjes)}
                </div>
                <div className="inline-flex items-center gap-2">
                  <Clock3 size={16} />
                  {formatTime(selectedMatch.ora_fillimit)}
                </div>
                <div className="inline-flex items-center gap-2">
                  <Shield size={16} />
                  {selectedMatch.faza || "Match"}
                </div>
                <div className="inline-flex items-center gap-2">
                  <Trophy size={16} />
                  {selectedMatch.kohezgjatja || DEFAULT_MATCH_DURATION_MINUTES}{" "}
                  min
                </div>
              </div>
            </div>

            {canManageLive && (
              <div className={`${panel} p-5 sm:p-6`}>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className={`text-lg font-bold ${strongText}`}>
                      Match Events
                    </h2>
                    <p className={`text-sm ${mutedText}`}>
                      Add goals and cards for the selected match.
                    </p>
                  </div>
                  <span
                    className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${
                      isLive(selectedMatch)
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                    }`}
                  >
                    <Radio size={14} />
                    {isLive(selectedMatch)
                      ? "Ready for events"
                      : "Match must be Live"}
                  </span>
                </div>

                <div className="mb-4 grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/50 md:grid-cols-[1fr_110px]">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                    Optional display note
                    <input
                      type="text"
                      name="player_name"
                      value={eventDetails.player_name}
                      onChange={handleEventDetailChange}
                      placeholder="Optional note"
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                    />
                  </label>
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                    Minute
                    <input
                      type="number"
                      min="0"
                      name="minuta"
                      value={eventDetails.minuta}
                      onChange={handleEventDetailChange}
                      placeholder="Auto"
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                    />
                  </label>
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 md:col-span-2">
                    Description
                    <input
                      type="text"
                      name="description"
                      value={eventDetails.description}
                      onChange={handleEventDetailChange}
                      placeholder="Optional note"
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                    />
                  </label>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <TeamBadge
                          name={selectedMatch.ekipi_shtepiak}
                          side="home"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400">
                            Home
                          </p>
                          <p className={`truncate font-bold ${strongText}`}>
                            {selectedMatch.ekipi_shtepiak || "Home Team"}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-lg bg-white px-3 py-1 text-xl font-black text-gray-900 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                        {score.home}
                      </span>
                    </div>
                    <label className="mt-4 block text-sm font-semibold text-gray-700 dark:text-slate-300">
                      Player
                      <select
                        name="lojtari_id"
                        value={
                          homePlayers.some(
                            (player) =>
                              String(player.id) === eventDetails.lojtari_id,
                          )
                            ? eventDetails.lojtari_id
                            : ""
                        }
                        onChange={handleEventDetailChange}
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                      >
                        <option value="">Select a player first</option>
                        {homePlayers.map((player) => (
                          <option key={player.id} value={player.id}>
                            {getPlayerNameOption(player)}
                          </option>
                        ))}
                      </select>
                    </label>
                    {!homePlayerSelected && (
                      <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-300">
                        Select a player to add goals or cards.
                      </p>
                    )}
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <ActionButton
                        tone="blue"
                        icon={<EventIcon type="Goal" size={16} />}
                        onClick={() =>
                          handleCreateEvent(
                            "Goal",
                            selectedMatch.ekipi_shtepiak_id,
                          )
                        }
                        disabled={
                          !isLive(selectedMatch) ||
                          !selectedMatch.ekipi_shtepiak_id ||
                          !homePlayerSelected
                        }
                      >
                        Goal
                      </ActionButton>
                      <ActionButton
                        tone="amber"
                        icon={<EventIcon type="YellowCard" />}
                        onClick={() =>
                          handleCreateEvent(
                            "YellowCard",
                            selectedMatch.ekipi_shtepiak_id,
                          )
                        }
                        disabled={
                          !isLive(selectedMatch) ||
                          !selectedMatch.ekipi_shtepiak_id ||
                          !homePlayerSelected
                        }
                      >
                        Yellow
                      </ActionButton>
                      <ActionButton
                        tone="red"
                        icon={<EventIcon type="RedCard" />}
                        onClick={() =>
                          handleCreateEvent(
                            "RedCard",
                            selectedMatch.ekipi_shtepiak_id,
                          )
                        }
                        disabled={
                          !isLive(selectedMatch) ||
                          !selectedMatch.ekipi_shtepiak_id ||
                          !homePlayerSelected
                        }
                      >
                        Red
                      </ActionButton>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <TeamBadge
                          name={selectedMatch.ekipi_mysafir}
                          side="away"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
                            Away
                          </p>
                          <p className={`truncate font-bold ${strongText}`}>
                            {selectedMatch.ekipi_mysafir || "Away Team"}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-lg bg-white px-3 py-1 text-xl font-black text-gray-900 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                        {score.away}
                      </span>
                    </div>
                    <label className="mt-4 block text-sm font-semibold text-gray-700 dark:text-slate-300">
                      Player
                      <select
                        name="lojtari_id"
                        value={
                          awayPlayers.some(
                            (player) =>
                              String(player.id) === eventDetails.lojtari_id,
                          )
                            ? eventDetails.lojtari_id
                            : ""
                        }
                        onChange={handleEventDetailChange}
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                      >
                        <option value="">Select a player first</option>
                        {awayPlayers.map((player) => (
                          <option key={player.id} value={player.id}>
                            {getPlayerNameOption(player)}
                          </option>
                        ))}
                      </select>
                    </label>
                    {!awayPlayerSelected && (
                      <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-300">
                        Select a player to add goals or cards.
                      </p>
                    )}
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <ActionButton
                        tone="blue"
                        icon={<EventIcon type="Goal" size={16} />}
                        onClick={() =>
                          handleCreateEvent(
                            "Goal",
                            selectedMatch.ekipi_mysafir_id,
                          )
                        }
                        disabled={
                          !isLive(selectedMatch) ||
                          !selectedMatch.ekipi_mysafir_id ||
                          !awayPlayerSelected
                        }
                      >
                        Goal
                      </ActionButton>
                      <ActionButton
                        tone="amber"
                        icon={<EventIcon type="YellowCard" />}
                        onClick={() =>
                          handleCreateEvent(
                            "YellowCard",
                            selectedMatch.ekipi_mysafir_id,
                          )
                        }
                        disabled={
                          !isLive(selectedMatch) ||
                          !selectedMatch.ekipi_mysafir_id ||
                          !awayPlayerSelected
                        }
                      >
                        Yellow
                      </ActionButton>
                      <ActionButton
                        tone="red"
                        icon={<EventIcon type="RedCard" />}
                        onClick={() =>
                          handleCreateEvent(
                            "RedCard",
                            selectedMatch.ekipi_mysafir_id,
                          )
                        }
                        disabled={
                          !isLive(selectedMatch) ||
                          !selectedMatch.ekipi_mysafir_id ||
                          !awayPlayerSelected
                        }
                      >
                        Red
                      </ActionButton>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className={`${panel} p-5 sm:p-6`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className={`text-lg font-bold ${strongText}`}>
                    Live Feed
                  </h2>
                  <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                    Automatic clock
                  </span>
                </div>

                {selectedEvents.length > 0 ? (
                  <div className="space-y-5">
                    {matchReportSections.map((section) => (
                      <section key={section.key} className="space-y-3">
                        <div className="flex items-center justify-between rounded-lg bg-gray-100 px-4 py-2 text-xs font-black uppercase tracking-wide text-gray-700 dark:bg-slate-900/70 dark:text-slate-300">
                          <span>{section.label}</span>
                          <span>{section.score}</span>
                        </div>

                        {section.events.length > 0 ? (
                          <div className="space-y-2">
                            {section.events.map((reportEvent) => {
                              const { event, type, side, scoreLabel } =
                                reportEvent;
                              const isAway = side === "away";
                              const isEditing = editingEventId === event.id;
                              const editPlayers =
                                isEditing && eventEditForm
                                  ? getPlayersForTeam(players, eventEditForm.ekipi_id)
                                  : [];
                              const primary =
                                getEventPerson(event) || getEventLabel(type);
                              const secondary =
                                event.description ||
                                event.teamName ||
                                (getEventPerson(event)
                                  ? getEventLabel(type)
                                  : "Match official update");

                              return (
                                <div
                                  key={`${event.id}-${getEventMinute(event)}-${type}`}
                                  className={`rounded-xl p-2 transition ${
                                    isEditing
                                      ? "border border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-900/50"
                                      : ""
                                  }`}
                                >
                                  <div
                                    className={`flex w-full items-center gap-3 ${
                                      isAway
                                        ? "sm:ml-auto sm:w-[52%] sm:justify-end sm:text-right"
                                        : "sm:w-[52%]"
                                    }`}
                                  >
                                    <span
                                      className={`order-1 w-10 shrink-0 text-base font-black ${strongText} ${
                                        isAway ? "sm:order-4 sm:text-right" : ""
                                      }`}
                                    >
                                      {formatMinute(getEventMinute(event))}
                                    </span>
                                    <span
                                      className={`order-2 grid h-10 w-10 shrink-0 place-items-center rounded-xl border bg-white shadow-sm dark:bg-slate-800 ${getEventClasses(type)}`}
                                    >
                                      <EventIcon type={type} />
                                    </span>
                                    <div
                                      className={`order-3 min-w-0 flex-1 ${
                                        isAway ? "sm:order-1" : ""
                                      }`}
                                    >
                                      <p
                                        className={`flex min-w-0 flex-wrap items-center gap-2 text-sm font-black ${strongText} ${
                                          isAway ? "sm:justify-end" : ""
                                        }`}
                                      >
                                        {scoreLabel && (
                                          <span className="inline-flex shrink-0 rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-xs font-black text-gray-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                                            {scoreLabel}
                                          </span>
                                        )}
                                        <span className="truncate">{primary}</span>
                                      </p>
                                      <p className={`truncate text-sm ${mutedText}`}>
                                        {secondary}
                                      </p>
                                    </div>
                                    {canManageLive && (
                                      <div
                                        className={`order-4 flex shrink-0 items-center gap-1 ${
                                          isAway ? "sm:order-2" : ""
                                        }`}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => beginEditEvent(event)}
                                          disabled={Boolean(savingAction)}
                                          className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                          aria-label="Edit event"
                                        >
                                          <Edit2 size={15} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteEvent(event)}
                                          disabled={Boolean(savingAction)}
                                          className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800"
                                          aria-label="Delete event"
                                        >
                                          <Trash2 size={15} />
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {isEditing && eventEditForm && (
                                    <div className="mt-4 grid gap-3 border-t border-gray-200 pt-4 md:grid-cols-2 dark:border-slate-700">
                                      <label className="text-sm font-semibold">
                                        Event
                                        <select
                                          name="lloji"
                                          value={eventEditForm.lloji}
                                          onChange={handleEventEditChange}
                                          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                        >
                                          <option value="Goal">Goal</option>
                                          <option value="YellowCard">
                                            Yellow Card
                                          </option>
                                          <option value="RedCard">Red Card</option>
                                        </select>
                                      </label>
                                      <label className="text-sm font-semibold">
                                        Team
                                        <select
                                          name="ekipi_id"
                                          value={eventEditForm.ekipi_id}
                                          onChange={handleEventEditChange}
                                          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                        >
                                          <option value="">No team</option>
                                          <option
                                            value={selectedMatch.ekipi_shtepiak_id}
                                          >
                                            {selectedMatch.ekipi_shtepiak ||
                                              "Home Team"}
                                          </option>
                                          <option
                                            value={selectedMatch.ekipi_mysafir_id}
                                          >
                                            {selectedMatch.ekipi_mysafir ||
                                              "Away Team"}
                                          </option>
                                        </select>
                                      </label>
                                      <label className="text-sm font-semibold">
                                        Player
                                        <select
                                          name="lojtari_id"
                                          value={
                                            editPlayers.some(
                                              (player) =>
                                                String(player.id) ===
                                                eventEditForm.lojtari_id,
                                            )
                                              ? eventEditForm.lojtari_id
                                              : ""
                                          }
                                          onChange={handleEventEditChange}
                                          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                        >
                                          <option value="">
                                            Select a player first
                                          </option>
                                          {editPlayers.map((player) => (
                                            <option key={player.id} value={player.id}>
                                              {getPlayerNameOption(player)}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                      {isEditing &&
                                        eventEditForm &&
                                        !eventEditForm.lojtari_id && (
                                          <p className="text-xs font-semibold text-amber-600 dark:text-amber-300">
                                            Select a player before saving this event.
                                          </p>
                                        )}
                                      <label className="text-sm font-semibold">
                                        Optional display note
                                        <input
                                          type="text"
                                          name="player_name"
                                          value={eventEditForm.player_name}
                                          onChange={handleEventEditChange}
                                          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                        />
                                      </label>
                                      <label className="text-sm font-semibold">
                                        Minute
                                        <input
                                          type="number"
                                          min="0"
                                          name="minuta"
                                          value={eventEditForm.minuta}
                                          onChange={handleEventEditChange}
                                          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                        />
                                      </label>
                                      <label className="text-sm font-semibold md:col-span-2">
                                        Description
                                        <input
                                          type="text"
                                          name="description"
                                          value={eventEditForm.description}
                                          onChange={handleEventEditChange}
                                          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                        />
                                      </label>
                                      <div className="flex justify-end gap-2 md:col-span-2">
                                        <button
                                          type="button"
                                          onClick={cancelEditEvent}
                                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                        >
                                          <X size={15} />
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateEvent(event)}
                                          disabled={
                                            Boolean(savingAction) ||
                                            !eventEditForm.lojtari_id
                                          }
                                          className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                                        >
                                          <Save size={15} />
                                          Save
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className={`px-2 py-3 text-sm ${mutedText}`}>
                            No events in this half.
                          </p>
                        )}
                      </section>
                    ))}
                  </div>
                ) : (
                  <EmptyEventsState
                    title="Waiting for the first match event"
                    description="Goals, cards, and live updates will appear here as the match changes."
                  />
                )}
              </div>

              <div className={`${panel} p-5 sm:p-6`}>
                <h2 className={`mb-5 text-lg font-bold ${strongText}`}>
                  Match Snapshot
                </h2>
                <div className="space-y-5">
                  <StatRow
                    label="Goals"
                    value={liveSummary.goals}
                    tone="bg-emerald-500"
                    width={`${Math.min(100, liveSummary.goals * 25)}%`}
                    icon={<EventIcon type="Goal" size={14} />}
                  />
                  <StatRow
                    label="Yellow Cards"
                    value={liveSummary.yellowCards}
                    tone="bg-amber-400"
                    width={`${Math.min(100, liveSummary.yellowCards * 20)}%`}
                    icon={<EventIcon type="YellowCard" />}
                  />
                  <StatRow
                    label="Red Cards"
                    value={liveSummary.redCards}
                    tone="bg-red-500"
                    width={`${Math.min(100, liveSummary.redCards * 25)}%`}
                    icon={<EventIcon type="RedCard" />}
                  />
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                    <p className={`text-sm ${mutedText}`}>
                      {isFinished(selectedMatch) ? "Final Result" : "Winner"}
                    </p>
                    <p className={`mt-1 text-2xl font-black ${strongText}`}>
                      {isFinished(selectedMatch)
                        ? score.home > score.away
                          ? selectedMatch.ekipi_shtepiak
                          : score.away > score.home
                            ? selectedMatch.ekipi_mysafir
                            : "Draw"
                        : "Pending"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className={`${panel} p-5`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className={`font-bold ${strongText}`}>Match Selector</h2>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  {matches.length}
                </span>
              </div>
              <div className="space-y-2">
                {matches.map((match) => {
                  const itemScore = getScore(match);
                  const active = match.id === selectedMatch.id;

                  return (
                    <div
                      key={match.id}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-blue-300 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-500/10"
                          : "border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-600"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedMatchId(match.id)}
                        className="w-full text-left"
                      >
                        <p className={`text-xs font-semibold ${mutedText}`}>
                          {match.turneu_emri || "Tournament"}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span
                            className={`min-w-0 truncate font-bold ${strongText}`}
                          >
                            {match.ekipi_shtepiak} vs {match.ekipi_mysafir}
                          </span>
                          <span className="rounded-lg bg-white px-2 py-1 text-sm font-black text-gray-900 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                            {itemScore.home}-{itemScore.away}
                          </span>
                        </div>
                      </button>
                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-200 pt-3 dark:border-slate-700">
                        <p className={`text-xs ${mutedText}`}>
                          {match.statusi} / {formatDate(match.data_ndeshjes)}
                        </p>
                        <Link
                          to={`/live-matches/${match.id}`}
                          className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-blue-600 transition hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                        >
                          Details
                          <ExternalLink size={13} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`${panel} p-5`}>
              <h2 className={`mb-4 font-bold ${strongText}`}>Live Updates</h2>
              <div className="space-y-3">
                {selectedEvents.slice(0, 5).map((event) => {
                  const type = getEventType(event);
                  return (
                    <div
                      key={`side-${event.id}-${getEventMinute(event)}`}
                      className="flex gap-3 border-b border-gray-200 pb-3 last:border-b-0 last:pb-0 dark:border-slate-700"
                    >
                      <div
                        className={`grid h-10 w-10 place-items-center rounded-lg border ${getEventClasses(type)}`}
                      >
                        <EventIcon type={type} size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`font-bold ${strongText}`}>
                            {getEventLabel(type)}
                          </p>
                          <span className={`text-xs ${mutedText}`}>
                            {formatMinute(getEventMinute(event))}
                          </span>
                        </div>
                        <p className={`truncate text-sm ${mutedText}`}>
                          {getEventPerson(event) || event.teamName || "Match update"}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {selectedEvents.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center dark:border-slate-700">
                    <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-lg bg-gray-50 text-gray-400 dark:bg-slate-900/60 dark:text-slate-500">
                      <FaFutbol size={17} aria-hidden="true" />
                    </div>
                    <p className={`text-sm font-semibold ${strongText}`}>
                      No live updates yet
                    </p>
                    <p className={`mt-1 text-xs ${mutedText}`}>
                      Match moments will show here instantly.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className={`${panel} p-5`}>
              <h2 className={`mb-4 font-bold ${strongText}`}>System</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className={`inline-flex items-center gap-2 ${mutedText}`}>
                    <Activity size={16} />
                    Server Status
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-300">
                    Online
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className={`inline-flex items-center gap-2 ${mutedText}`}>
                    <Radio size={16} />
                    Feed
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-300">
                    Connected
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default LiveMatches;
