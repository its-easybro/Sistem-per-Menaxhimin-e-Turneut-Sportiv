import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  CalendarDays,
  CircleDot,
  Clock3,
  Radio,
  Shield,
  Trophy,
} from "lucide-react";
import { FaFutbol } from "react-icons/fa";
import api from "../../config/axiosInstance";
import socket from "../../socket";
import CardSkeleton from "../../components/Skeletons/CardSkeleton";
import { useMatchTimer } from "../../hooks/useMatchTimer";

// Shared styles and utility functions for the live match page, including formatting helpers, event type checks, and components for rendering match events and status badges.
const DEFAULT_MATCH_DURATION_MINUTES = 60;
const panel =
  "rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800";
const mutedText = "text-gray-500 dark:text-slate-400";
const strongText = "text-gray-900 dark:text-slate-100";

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

// Extracts initials from a team name for display in the team badge, handling edge cases gracefully.
function getInitials(value) {
  return (value || "Team")
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

function getEventType(event) {
  return event.eventType || event.card || event.lloji || "Event";
}

function getEventMinute(event) {
  return event.minute ?? event.minuta;
}

function getEventPerson(event) {
  return event.playerName || event.player_name || "";
}

function isGoalEvent(type) {
  return type === "Goal" || type === "Gol";
}

function isYellowCardEvent(type) {
  return type === "YellowCard" || type === "E verdhe";
}

function isRedCardEvent(type) {
  return type === "RedCard" || type === "E kuqe";
}

function isFinished(match) {
  const status = String(match?.statusi || "").toLowerCase();
  return (
    status.includes("rfunduar") ||
    status.includes("finished") ||
    status.includes("final")
  );
}

// Maps raw event types to user-friendly labels for display in the match timeline and report.
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

    if (isGoalEvent(type)) {
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
      scoreLabel: isGoalEvent(type) ? `${homeScore} - ${awayScore}` : "",
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

function formatMinute(minute) {
  const parsed = Number(minute);
  if (!Number.isFinite(parsed) || parsed < 0) return "--";
  return `${parsed}'`;
}

function EventIcon({ type, size = 18 }) {
  if (isGoalEvent(type)) {
    return <FaFutbol size={size} aria-hidden="true" />;
  }

  if (isYellowCardEvent(type)) {
    return (
      <span
        className="block h-5 w-3.5 rounded-sm border border-amber-500 bg-amber-300 shadow-sm"
        aria-hidden="true"
      />
    );
  }

  if (isRedCardEvent(type)) {
    return (
      <span
        className="block h-5 w-3.5 rounded-sm border border-red-600 bg-red-500 shadow-sm"
        aria-hidden="true"
      />
    );
  }

  return <CircleDot size={size} aria-hidden="true" />;
}

function EmptyEventsState() {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500 dark:border-slate-700 dark:text-slate-400">
      <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl border border-gray-200 bg-gray-50 text-gray-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-500">
        <FaFutbol size={20} aria-hidden="true" />
      </div>
      <p className={`font-bold ${strongText}`}>
        Waiting for the first match event
      </p>
      <p className={`mt-1 text-sm ${mutedText}`}>
        Goals, cards, and live updates will appear here as the match changes.
      </p>
    </div>
  );
}

// Component for rendering a badge with the team's initials, styled according to the event type (goal, yellow card, red card) for display in the match timeline.
function TeamBadge({ name, tone }) {
  return (
    <div
      className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-sm font-black ${tone}`}
    >
      {getInitials(name)}
    </div>
  );
}

function ClockBadge({ match }) {
  const { display, minutes } = useMatchTimer(match);

  if (match?.statusi === "HalfTime") {
    return <span className="text-emerald-600 dark:text-emerald-300">HT</span>;
  }

  if (isFinished(match)) {
    return <span className="text-emerald-600 dark:text-emerald-300">FT</span>;
  }

  if (match?.statusi !== "Live") {
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

function StatusBadge({ match }) {
  if (match?.statusi === "Live") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
        <Radio size={14} />
        LIVE
      </span>
    );
  }

  if (match?.statusi === "HalfTime") {
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

function getStatusLabel(match) {
  if (match?.statusi === "Live") return "LIVE";
  if (match?.statusi === "HalfTime") return "Half time";
  if (isFinished(match)) return "Final";

  return match?.statusi || "Scheduled";
}

function eventTone(type) {
  if (isGoalEvent(type)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (isRedCardEvent(type)) {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300";
  }

  if (isYellowCardEvent(type)) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
  }

  return "border-gray-200 bg-gray-50 text-gray-700 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-300";
}

function PublicLiveMatch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [availableMatches, setAvailableMatches] = useState([]);
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const matchId = Number(activeMatchId);
  const score = getScore(match);
  const events = useMemo(() => getTimelineEvents(match), [match]);
  const matchReportSections = useMemo(
    () => getMatchReportSections(match),
    [match],
  );
  const liveSummary = useMemo(() => {
    return events.reduce(
      (summary, event) => {
        const type = getEventType(event);

        if (isGoalEvent(type)) summary.goals += 1;
        if (type === "YellowCard" || type === "E verdhe") {
          summary.yellowCards += 1;
        }
        if (type === "RedCard" || type === "E kuqe") {
          summary.redCards += 1;
        }

        return summary;
      },
      { goals: 0, yellowCards: 0, redCards: 0 },
    );
  }, [events]);

  useEffect(() => {
    const loadMatch = async () => {
      try {
        setLoading(true);
        setError("");
        // Load the selector list first so /live-matches can pick a sensible default.
        const listResponse = await api.get("/matches/public/live");
        const matches = Array.isArray(listResponse.data)
          ? listResponse.data
          : [];
        let nextMatchId = id;

        setAvailableMatches(matches);

        if (!nextMatchId) {
          nextMatchId = matches[0]?.id;
        }

        if (!nextMatchId) {
          setMatch(null);
          setActiveMatchId(null);
          return;
        }

        setActiveMatchId(nextMatchId);
        const response = await api.get(`/matches/public/live/${nextMatchId}`);
        setMatch(response.data);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };

    loadMatch();
  }, [id]);

  const handleMatchSelect = (event) => {
    const nextMatchId = event.target.value;

    if (!nextMatchId) return;
    // Navigating keeps the selected match shareable as a direct public URL.
    navigate(`/live-matches/${nextMatchId}`);
  };

  useEffect(() => {
    // Socket updates keep the public view in sync while the referee edits the live match.
    const updateSelectedMatch = (updater) => {
      setMatch((current) => {
        if (!current || current.id !== matchId) return current;
        return updater(current);
      });
    };

    const handleScoreUpdate = ({
      matchId: updatedMatchId,
      homeScore,
      awayScore,
    }) => {
      if (updatedMatchId !== matchId) return;

      updateSelectedMatch((current) => ({
        ...current,
        score: {
          golat_shtepiak: homeScore,
          golat_mysafir: awayScore,
        },
      }));
    };

    const upsertEvent = (event) => {
      if (event.matchId !== matchId) return;

      updateSelectedMatch((current) => {
        const cards = current.cards || [];
        const events = current.events || [];
        const cardExists = cards.some((item) => item.id === event.id);
        const eventExists = events.some((item) => item.id === event.id);

        if (!cardExists && !eventExists) {
          return {
            ...current,
            events: [...events, event],
          };
        }

        return {
          ...current,
          cards: cards.map((item) => (item.id === event.id ? event : item)),
          events: events.map((item) => (item.id === event.id ? event : item)),
        };
      });
    };

    const deleteEvent = ({ matchId: deletedMatchId, eventId }) => {
      if (deletedMatchId !== matchId) return;

      updateSelectedMatch((current) => ({
        ...current,
        cards: (current.cards || []).filter((event) => event.id !== eventId),
        events: (current.events || []).filter((event) => event.id !== eventId),
      }));
    };

    const updateStatus = ({ matchId: updatedMatchId, statusi, status }) => {
      if (updatedMatchId !== matchId) return;

      updateSelectedMatch((current) => ({
        ...current,
        statusi: statusi || status || current.statusi,
      }));
    };

    // Some events use snake_case and others use camelCase, so listen to both just in case.
    socket.on("score_update", handleScoreUpdate);
    socket.on("score-updated", handleScoreUpdate);
    socket.on("match-event-created", upsertEvent);
    socket.on("match-event-updated", upsertEvent);
    socket.on("match-event-deleted", deleteEvent);
    socket.on("match-status-updated", updateStatus);
    socket.on("match-finished", updateStatus);

    return () => {
      socket.off("score_update", handleScoreUpdate);
      socket.off("score-updated", handleScoreUpdate);
      socket.off("match-event-created", upsertEvent);
      socket.off("match-event-updated", upsertEvent);
      socket.off("match-event-deleted", deleteEvent);
      socket.off("match-status-updated", updateStatus);
      socket.off("match-finished", updateStatus);
    };
  }, [matchId]);

  if (loading) {
    return (
      <main className="w-full bg-gray-100 px-4 py-6 text-gray-900 dark:bg-slate-900 dark:text-slate-100">
        <div className="mx-auto max-w-6xl">
          <CardSkeleton />
        </div>
      </main>
    );
  }

  // If there was an error loading the match or no match was found, show a user-friendly message with a link back to the live matches list.
  if (error || !match) {
    return (
      <main className="w-full bg-gray-100 px-4 py-6 text-gray-900 dark:bg-slate-900 dark:text-slate-100">
        <div className={`mx-auto max-w-6xl p-8 ${panel}`}>
          <h1 className={`text-2xl font-bold ${strongText}`}>
            {error ? "Match unavailable" : "Live Match Center"}
          </h1>
          <p className={`mt-2 ${mutedText}`}>
            {error || "No live or recent matches found."}
          </p>
          <Link
            to="/live-matches"
            className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            Back to live matches
          </Link>
        </div>
      </main>
    );
  }

  return (
    // The main content area for the live match page, displaying match details, score, timeline of events, and a report section, all styled with Tailwind CSS and responsive design principles.
    <main className="w-full bg-gray-100 px-4 py-6 text-gray-900 dark:bg-slate-900 dark:text-slate-100 sm:px-6 lg:px-0">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              to="/live-matches"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
            >
              Back to live matches
            </Link>
            <h1 className={`mt-2 text-3xl font-bold ${strongText}`}>
              {match.turneu_emri || "Tournament"}
            </h1>
            <p className={`mt-1 text-sm ${mutedText}`}>
              {match.faza || "Match"} live detail
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            {availableMatches.length > 1 && (
              <label className="w-full text-sm font-semibold text-gray-700 dark:text-slate-300 sm:w-80">
                Match
                <select
                  value={String(match?.id || activeMatchId || "")}
                  onChange={handleMatchSelect}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                >
                  {availableMatches.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.ekipi_shtepiak || "Home Team"} vs{" "}
                      {item.ekipi_mysafir || "Away Team"} -{" "}
                      {item.turneu_emri || "Tournament"} -{" "}
                      {getStatusLabel(item)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <StatusBadge match={match} />
          </div>
        </div>

        {/* MATCH DETAILS */}
        <section className={`${panel} overflow-hidden`}>
          <div className="grid items-center gap-5 p-5 sm:p-6 md:grid-cols-[1fr_auto_1fr]">
            <div className="flex min-w-0 items-center gap-4 md:justify-end md:text-right">
              <TeamBadge
                name={match.ekipi_shtepiak}
                tone="bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
              />
              <div className="min-w-0">
                <p className={`truncate text-xl font-black ${strongText}`}>
                  {match.ekipi_shtepiak || "Home Team"}
                </p>
                <p className="mt-1 text-xs font-bold uppercase text-blue-600 dark:text-blue-400">
                  Home
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-8 py-5 text-center dark:border-slate-700 dark:bg-slate-900/60">
              <div className={`text-5xl font-black ${strongText}`}>
                {score.home} - {score.away}
              </div>
              <div className="mt-2 text-2xl font-black">
                <ClockBadge match={match} />
              </div>
              {isFinished(match) && (
                <p className="mt-1 text-xs font-bold uppercase text-emerald-600 dark:text-emerald-300">
                  Final score
                </p>
              )}
            </div>

            <div className="flex min-w-0 items-center gap-4 md:flex-row-reverse md:justify-end">
              <TeamBadge
                name={match.ekipi_mysafir}
                tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
              />
              <div className="min-w-0">
                <p className={`truncate text-xl font-black ${strongText}`}>
                  {match.ekipi_mysafir || "Away Team"}
                </p>
                <p className="mt-1 text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  Away
                </p>
              </div>
            </div>
          </div>
          {/* MATCH DETAILS */}
          <div className="grid gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
            <div className="inline-flex items-center gap-2">
              <CalendarDays size={16} />
              {formatDate(match.data_ndeshjes)}
            </div>
            <div className="inline-flex items-center gap-2">
              <Clock3 size={16} />
              {formatTime(match.ora_fillimit)}
            </div>
            <div className="inline-flex items-center gap-2">
              <Shield size={16} />
              {match.faza || "Match"}
            </div>
            <div className="inline-flex items-center gap-2">
              <Trophy size={16} />
              {match.kohezgjatja || DEFAULT_MATCH_DURATION_MINUTES} min
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className={`${panel} p-5 sm:p-6`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className={`text-lg font-bold ${strongText}`}>Timeline</h2>
              <span className={`text-sm ${mutedText}`}>
                {events.length} events
              </span>
            </div>

            {/* MATCH REPORT SECTIONS */}
            {events.length > 0 ? (
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
                          const { event, type, side, scoreLabel } = reportEvent;
                          const isAway = side === "away";
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
                              className={`flex w-full items-center gap-3 rounded-xl p-2 ${
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
                                className={`order-2 grid h-10 w-10 shrink-0 place-items-center rounded-xl border bg-white shadow-sm dark:bg-slate-800 ${eventTone(type)}`}
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
              <EmptyEventsState />
            )}
          </section>

          <aside className="space-y-6">
            <section className={`${panel} p-5`}>
              <h2 className={`mb-4 font-bold ${strongText}`}>Match Snapshot</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center gap-2 ${mutedText}`}
                  >
                    <EventIcon type="Goal" size={14} />
                    Goals
                  </span>
                  <span className={`font-black ${strongText}`}>
                    {liveSummary.goals}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center gap-2 ${mutedText}`}
                  >
                    <EventIcon type="YellowCard" />
                    Yellow Cards
                  </span>
                  <span className={`font-black ${strongText}`}>
                    {liveSummary.yellowCards}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center gap-2 ${mutedText}`}
                  >
                    <EventIcon type="RedCard" />
                    Red Cards
                  </span>
                  <span className={`font-black ${strongText}`}>
                    {liveSummary.redCards}
                  </span>
                </div>
              </div>
            </section>

            <section className={`${panel} p-5`}>
              <h2 className={`mb-4 font-bold ${strongText}`}>System</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center gap-2 ${mutedText}`}
                  >
                    <Activity size={16} />
                    Server Status
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-300">
                    Online
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center gap-2 ${mutedText}`}
                  >
                    <Radio size={16} />
                    Feed
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-300">
                    Connected
                  </span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default PublicLiveMatch;
