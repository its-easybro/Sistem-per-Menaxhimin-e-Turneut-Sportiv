import { useContext, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CircleDot,
  Clock3,
  Flag,
  Radio,
  RefreshCcw,
  Shield,
  Trophy,
  Wifi,
} from "lucide-react";
import api from "../../config/axiosInstance";
import socket from "../../socket";
import { Alert } from "../../components/Alert";
import CardSkeleton from "../../components/Skeletons/CardSkeleton";
import AuthContext from "../../context/AuthContext";
import { useMatchTimer } from "../../hooks/useMatchTimer";

const DEFAULT_MATCH_DURATION_MINUTES = 60;

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
  const status = String(match?.statusi || "");
  return status.includes("rfunduar");
}

function getEventType(event) {
  return event.eventType || event.card || "Event";
}

function isGoalEventType(type) {
  return type === "Goal" || type === "Gol";
}

function getEventMinute(event) {
  return event.minute ?? event.minuta;
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
  if (isGoalEventType(type)) return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200";
  if (type === "RedCard" || type === "E kuqe") return "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-500/15 dark:text-red-200";
  if (type === "YellowCard" || type === "E verdhe") return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100";

  return "border-gray-200 bg-gray-50 text-gray-700 dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-200";
}

function getTimelineEvents(match) {
  return [...(match?.cards || []), ...(match?.events || [])].sort((a, b) => {
    const minuteA = Number(getEventMinute(a));
    const minuteB = Number(getEventMinute(b));
    const safeMinuteA = Number.isFinite(minuteA) ? minuteA : Number.MAX_SAFE_INTEGER;
    const safeMinuteB = Number.isFinite(minuteB) ? minuteB : Number.MAX_SAFE_INTEGER;

    if (safeMinuteA !== safeMinuteB) return safeMinuteB - safeMinuteA;
    return Number(b.id || 0) - Number(a.id || 0);
  });
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

function TeamCrest({ name, side }) {
  const color =
    side === "home"
      ? "from-blue-500 to-cyan-400 border-blue-300/40"
      : "from-emerald-500 to-lime-400 border-emerald-300/40";

  return (
    <div className={`grid h-24 w-24 place-items-center rounded-full border bg-gradient-to-br ${color} shadow-2xl shadow-black/30 sm:h-28 sm:w-28`}>
      <div className="grid h-16 w-16 place-items-center rounded-full border border-white/30 bg-slate-950/35 text-2xl font-black text-white sm:h-20 sm:w-20">
        {getInitials(name)}
      </div>
    </div>
  );
}

function StatusBadge({ match }) {
  if (isLive(match)) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500 px-4 py-1.5 text-sm font-bold text-white shadow-lg shadow-red-950/30">
        <Radio size={15} />
        LIVE
      </span>
    );
  }

  if (isHalfTime(match)) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-4 py-1.5 text-sm font-bold text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/20 dark:text-amber-100">
        <Clock3 size={15} />
        HALF TIME
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 dark:border-slate-500/40 dark:bg-slate-700/60 dark:text-slate-100">
      <CircleDot size={15} />
      {match?.statusi || "Scheduled"}
    </span>
  );
}

function ClockBadge({ match }) {
  const { display, minutes } = useMatchTimer(match);

  if (isHalfTime(match)) {
    return <span className="text-emerald-600 dark:text-emerald-300">HT</span>;
  }

  if (!isLive(match)) {
    return <span className="text-gray-500 dark:text-slate-400">--</span>;
  }

  return (
    <span className="text-emerald-600 dark:text-emerald-300">
      {minutes}
      <span className="text-2xl">'</span>
      <span className="ml-2 text-lg text-gray-500 dark:text-slate-300">{display}</span>
    </span>
  );
}

function LiveMatches() {
  const { user } = useContext(AuthContext);
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [savingAction, setSavingAction] = useState("");

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

  const score = getScore(selectedMatch);

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
        const events = match.events || [];
        if (events.some((item) => item.id === event.id)) return match;

        return {
          ...match,
          events: [...events, event],
        };
      });
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

    return () => {
      socket.off("match_live", handleMatchLive);
      socket.off("match_finished", handleMatchFinished);
      socket.off("match-finished", handleMatchFinished);
      socket.off("match-status-updated", handleMatchStatusUpdated);
      socket.off("score_update", handleScoreUpdate);
      socket.off("score-updated", handleScoreUpdate);
      socket.off("card_event", handleCardEvent);
      socket.off("match-event-created", appendEvent);
    };
  }, []);

  const applyMatchPatch = (matchId, patch) => {
    setMatches((prev) =>
      prev.map((match) =>
        match.id === matchId ? { ...match, ...patch } : match,
      ),
    );
  };

  const handleCreateEvent = async (lloji, teamId) => {
    if (!selectedMatch) return;

    try {
      setSavingAction(`${lloji}-${teamId}`);
      const response = await api.post(`/matches/${selectedMatch.id}/events`, {
        lloji,
        ekipi_id: teamId,
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
        applyMatchPatch(selectedMatch.id, {
          score: {
            golat_shtepiak: response.data.score.golat_shtepiak ?? 0,
            golat_mysafir: response.data.score.golat_mysafir ?? 0,
          },
        });
      }
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

  const ActionButton = ({ children, icon, onClick, disabled, tone = "slate" }) => {
    const tones = {
      green: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/25",
      amber: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100 dark:hover:bg-amber-500/25",
      red: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-400/30 dark:bg-red-500/15 dark:text-red-100 dark:hover:bg-red-500/25",
      blue: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-100 dark:hover:bg-blue-500/25",
      slate: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-500/40 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:bg-slate-700/80",
    };

    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || Boolean(savingAction)}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:border-slate-700 dark:disabled:bg-slate-800/40 dark:disabled:text-slate-500 ${tones[tone]}`}
      >
        {icon}
        {children}
      </button>
    );
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto max-w-7xl">
          <CardSkeleton />
        </div>
      </main>
    );
  }

  if (!selectedMatch) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900 dark:bg-slate-900 dark:text-white">
        <div className="mx-auto max-w-7xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <h1 className="text-2xl font-black">Live Match Center</h1>
          <p className="mt-2 text-gray-500 dark:text-slate-400">No live or recent matches found.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        {alert && (
          <div className="mb-4">
            <Alert
              type={alert.type}
              message={alert.message}
              onClose={() => setAlert(null)}
            />
          </div>
        )}

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-xl dark:shadow-black/20">
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-slate-300">
            <span className="font-bold text-gray-900 dark:text-white">Live Match</span>
            <span className="text-gray-300 dark:text-slate-600">/</span>
            <span>{selectedMatch.turneu_emri || "Tournament"}</span>
            <span className="text-gray-300 dark:text-slate-600">/</span>
            <span>{selectedMatch.faza || "Match"}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-300">
              <Wifi size={16} />
              Live feed connected
            </span>
            <button
              type="button"
              onClick={loadMatches}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCcw size={15} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <section className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-950 dark:shadow-2xl dark:shadow-black/40">
              <div className="relative min-h-[300px] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(239,246,255,0.96)),linear-gradient(90deg,rgba(37,99,235,0.18),rgba(16,185,129,0.16)),linear-gradient(0deg,rgba(22,163,74,0.10),rgba(255,255,255,0.08))] px-5 py-6 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.55),rgba(2,6,23,0.92)),linear-gradient(90deg,rgba(29,78,216,0.35),rgba(22,163,74,0.28)),linear-gradient(0deg,rgba(22,101,52,0.22),rgba(15,23,42,0.05))] sm:px-8">
                <div className="absolute inset-x-0 bottom-0 h-24 border-t border-emerald-500/10 bg-[repeating-linear-gradient(90deg,rgba(16,185,129,0.10)_0,rgba(16,185,129,0.10)_1px,transparent_1px,transparent_110px)] dark:bg-[repeating-linear-gradient(90deg,rgba(34,197,94,0.08)_0,rgba(34,197,94,0.08)_1px,transparent_1px,transparent_110px)]" />
                <div className="relative z-10 flex flex-col items-center gap-6">
                  <div className="text-center">
                    <h1 className="text-2xl font-black text-gray-950 dark:text-white sm:text-3xl">
                      {selectedMatch.turneu_emri || "Tournament"}
                    </h1>
                    <div className="mt-3">
                      <StatusBadge match={selectedMatch} />
                    </div>
                  </div>

                  <div className="grid w-full items-center gap-5 md:grid-cols-[1fr_auto_1fr]">
                    <div className="flex flex-col items-center gap-3 text-center md:items-end md:text-right">
                      <TeamCrest name={selectedMatch.ekipi_shtepiak} side="home" />
                      <div>
                        <p className="text-2xl font-black text-gray-950 dark:text-white">
                          {selectedMatch.ekipi_shtepiak || "Home Team"}
                        </p>
                        <p className="mt-1 inline-flex rounded-md bg-blue-500 px-2 py-1 text-xs font-bold text-white">
                          HOME
                        </p>
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-7xl font-black text-gray-950 drop-shadow-sm dark:text-white dark:drop-shadow-2xl sm:text-8xl">
                        {score.home} - {score.away}
                      </div>
                      <div className="mt-2 text-4xl font-black">
                        <ClockBadge match={selectedMatch} />
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-3 text-center md:items-start md:text-left">
                      <TeamCrest name={selectedMatch.ekipi_mysafir} side="away" />
                      <div>
                        <p className="text-2xl font-black text-gray-950 dark:text-white">
                          {selectedMatch.ekipi_mysafir || "Away Team"}
                        </p>
                        <p className="mt-1 inline-flex rounded-md bg-emerald-500 px-2 py-1 text-xs font-bold text-white">
                          AWAY
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid w-full gap-3 border-t border-gray-900/10 pt-4 text-sm text-gray-600 dark:border-white/10 dark:text-slate-200 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="inline-flex items-center justify-center gap-2">
                      <CalendarDays size={16} />
                      {formatDate(selectedMatch.data_ndeshjes)}
                    </div>
                    <div className="inline-flex items-center justify-center gap-2">
                      <Clock3 size={16} />
                      {formatTime(selectedMatch.ora_fillimit)}
                    </div>
                    <div className="inline-flex items-center justify-center gap-2">
                      <Shield size={16} />
                      {selectedMatch.faza || "Match"}
                    </div>
                    <div className="inline-flex items-center justify-center gap-2">
                      <Trophy size={16} />
                      {selectedMatch.kohezgjatja || DEFAULT_MATCH_DURATION_MINUTES} min
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {canManageLive && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-xl dark:shadow-black/20">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-black text-gray-950 dark:text-white">Match Events</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Add goals and cards for the selected match.
                    </p>
                  </div>
                  <span
                    className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${
                      isLive(selectedMatch)
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200"
                        : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100"
                    }`}
                  >
                    <Radio size={14} />
                    {isLive(selectedMatch) ? "Ready for events" : "Match must be Live"}
                  </span>
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-400/20 dark:bg-blue-500/10">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase text-blue-600 dark:text-blue-200">Home</p>
                        <p className="truncate text-base font-black text-gray-950 dark:text-white">
                          {selectedMatch.ekipi_shtepiak || "Home Team"}
                        </p>
                      </div>
                      <span className="rounded-lg bg-white px-3 py-1 text-xl font-black text-gray-950 shadow-sm dark:bg-slate-950/60 dark:text-white dark:shadow-none">
                        {score.home}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <ActionButton
                        tone="blue"
                        icon={<CircleDot size={16} />}
                        onClick={() => handleCreateEvent("Goal", selectedMatch.ekipi_shtepiak_id)}
                        disabled={!isLive(selectedMatch) || !selectedMatch.ekipi_shtepiak_id}
                      >
                        Goal
                      </ActionButton>
                      <ActionButton
                        tone="amber"
                        icon={<AlertTriangle size={16} />}
                        onClick={() => handleCreateEvent("YellowCard", selectedMatch.ekipi_shtepiak_id)}
                        disabled={!isLive(selectedMatch) || !selectedMatch.ekipi_shtepiak_id}
                      >
                        Yellow
                      </ActionButton>
                      <ActionButton
                        tone="red"
                        icon={<Flag size={16} />}
                        onClick={() => handleCreateEvent("RedCard", selectedMatch.ekipi_shtepiak_id)}
                        disabled={!isLive(selectedMatch) || !selectedMatch.ekipi_shtepiak_id}
                      >
                        Red
                      </ActionButton>
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-400/20 dark:bg-emerald-500/10">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-200">Away</p>
                        <p className="truncate text-base font-black text-gray-950 dark:text-white">
                          {selectedMatch.ekipi_mysafir || "Away Team"}
                        </p>
                      </div>
                      <span className="rounded-lg bg-white px-3 py-1 text-xl font-black text-gray-950 shadow-sm dark:bg-slate-950/60 dark:text-white dark:shadow-none">
                        {score.away}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <ActionButton
                        tone="blue"
                        icon={<CircleDot size={16} />}
                        onClick={() => handleCreateEvent("Goal", selectedMatch.ekipi_mysafir_id)}
                        disabled={!isLive(selectedMatch) || !selectedMatch.ekipi_mysafir_id}
                      >
                        Goal
                      </ActionButton>
                      <ActionButton
                        tone="amber"
                        icon={<AlertTriangle size={16} />}
                        onClick={() => handleCreateEvent("YellowCard", selectedMatch.ekipi_mysafir_id)}
                        disabled={!isLive(selectedMatch) || !selectedMatch.ekipi_mysafir_id}
                      >
                        Yellow
                      </ActionButton>
                      <ActionButton
                        tone="red"
                        icon={<Flag size={16} />}
                        onClick={() => handleCreateEvent("RedCard", selectedMatch.ekipi_mysafir_id)}
                        disabled={!isLive(selectedMatch) || !selectedMatch.ekipi_mysafir_id}
                      >
                        Red
                      </ActionButton>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-xl dark:shadow-black/20">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-black text-gray-950 dark:text-white">Live Feed</h2>
                  <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    Clocked automatically
                  </span>
                </div>

                {selectedEvents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedEvents.slice(0, 7).map((event) => {
                      const type = getEventType(event);
                      return (
                        <div
                          key={`${event.id}-${getEventMinute(event)}-${type}`}
                          className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${getEventClasses(type)}`}
                        >
                          <div className="w-12 text-lg font-black">
                            {formatMinute(getEventMinute(event))}
                          </div>
                          <div className="grid h-10 w-10 place-items-center rounded-full bg-white/70 dark:bg-slate-950/40">
                            {isGoalEventType(type) ? <CircleDot size={18} /> : <Flag size={18} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-black text-gray-950 dark:text-white">
                              {getEventLabel(type)}
                              {event.teamName ? ` - ${event.teamName}` : ""}
                            </p>
                            <p className="truncate text-sm text-gray-500 dark:text-slate-300">
                              {event.playerName || "Match official update"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500 dark:border-slate-700 dark:text-slate-400">
                    No goals or cards yet.
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-xl dark:shadow-black/20">
                <h2 className="mb-5 text-lg font-black text-gray-950 dark:text-white">Match Snapshot</h2>
                <div className="space-y-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-slate-400">Goals</span>
                      <span className="font-black text-gray-950 dark:text-white">{liveSummary.goals}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-emerald-400"
                        style={{ width: `${Math.min(100, liveSummary.goals * 25)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-slate-400">Yellow Cards</span>
                      <span className="font-black text-gray-950 dark:text-white">{liveSummary.yellowCards}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-amber-400"
                        style={{ width: `${Math.min(100, liveSummary.yellowCards * 20)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-slate-400">Red Cards</span>
                      <span className="font-black text-gray-950 dark:text-white">{liveSummary.redCards}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-red-400"
                        style={{ width: `${Math.min(100, liveSummary.redCards * 25)}%` }}
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-950/70">
                    <p className="text-sm text-gray-500 dark:text-slate-400">Winner</p>
                    <p className="mt-1 text-2xl font-black text-gray-950 dark:text-white">
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

          <aside className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-xl dark:shadow-black/20">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-black text-gray-950 dark:text-white">Match Selector</h2>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                  {matches.length}
                </span>
              </div>
              <div className="space-y-2">
                {matches.map((match) => {
                  const itemScore = getScore(match);
                  const active = match.id === selectedMatch.id;

                  return (
                    <button
                      type="button"
                      key={match.id}
                      onClick={() => setSelectedMatchId(match.id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-blue-300 bg-blue-50 dark:border-blue-400/50 dark:bg-blue-500/15"
                          : "border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-600"
                      }`}
                    >
                      <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                        {match.turneu_emri || "Tournament"}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate font-bold text-gray-950 dark:text-white">
                          {match.ekipi_shtepiak} vs {match.ekipi_mysafir}
                        </span>
                        <span className="rounded-lg bg-white px-2 py-1 text-sm font-black text-gray-950 shadow-sm dark:bg-slate-800 dark:text-white dark:shadow-none">
                          {itemScore.home}-{itemScore.away}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500 dark:text-slate-500">
                        {match.statusi} · {formatDate(match.data_ndeshjes)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-xl dark:shadow-black/20">
              <h2 className="mb-4 font-black text-gray-950 dark:text-white">Live Updates</h2>
              <div className="space-y-3">
                {selectedEvents.slice(0, 5).map((event) => {
                  const type = getEventType(event);
                  return (
                    <div
                      key={`side-${event.id}-${getEventMinute(event)}`}
                      className="flex gap-3 border-b border-gray-200 pb-3 last:border-b-0 last:pb-0 dark:border-slate-800"
                    >
                      <div className={`grid h-10 w-10 place-items-center rounded-full border ${getEventClasses(type)}`}>
                        {isGoalEventType(type) ? <CircleDot size={16} /> : <Flag size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-gray-950 dark:text-white">{getEventLabel(type)}</p>
                          <span className="text-xs text-gray-500 dark:text-slate-500">
                            {formatMinute(getEventMinute(event))}
                          </span>
                        </div>
                        <p className="truncate text-sm text-gray-500 dark:text-slate-400">
                          {event.teamName || "Match update"}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {selectedEvents.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-slate-400">No updates yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-xl dark:shadow-black/20">
              <h2 className="mb-4 font-black text-gray-950 dark:text-white">System</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-gray-500 dark:text-slate-400">
                    <Activity size={16} />
                    Server Status
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-300">Online</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-gray-500 dark:text-slate-400">
                    <Radio size={16} />
                    Feed
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-300">Connected</span>
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
