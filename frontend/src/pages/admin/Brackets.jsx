import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Dices,
  GitBranch,
  Play,
  RefreshCcw,
  RotateCcw,
  Trash2,
  Trophy,
} from "lucide-react";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";
import BracketTree from "../../components/BracketTree";
import TableSkeleton from "../../components/Skeletons/TableSkeleton";

const panel =
  "rounded-lg border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800";
const strongText = "text-gray-900 dark:text-slate-100";
const mutedText = "text-gray-500 dark:text-slate-400";

function getArrayPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function getRegistrationTime(registration) {
  const value = registration.data_regjistrimit || registration.created_at;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

function getRegistrationTeamName(registration) {
  return registration.ekipi_emri || registration.teams?.emertimi || "Unknown team";
}

function shuffleIds(ids) {
  // Randomizes only the seed order; backend generation still receives a normal ordered list.
  const next = [...ids];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function moveItem(items, index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= items.length) return items;

  const next = [...items];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

function SeedList({ teams, seedIds, onMove }) {
  if (!seedIds.length) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center dark:border-slate-700">
        <p className={`font-bold ${strongText}`}>No approved teams</p>
        <p className={`mt-1 text-sm ${mutedText}`}>
          Approve at least two team registrations before generating a bracket.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {seedIds.map((teamId, index) => {
        const team = teams.find((item) => item.id === teamId);

        return (
          <div
            key={teamId}
            className="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          >
            <span className="grid h-9 w-9 place-items-center rounded-md bg-blue-50 text-sm font-black text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              {index + 1}
            </span>
            <span className={`min-w-0 truncate font-bold ${strongText}`}>
              {team?.emertimi || `Team #${teamId}`}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onMove(index, -1)}
                disabled={index === 0}
                className="grid h-8 w-8 place-items-center rounded-md border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                aria-label="Move seed up"
              >
                <ArrowUp size={15} />
              </button>
              <button
                type="button"
                onClick={() => onMove(index, 1)}
                disabled={index === seedIds.length - 1}
                className="grid h-8 w-8 place-items-center rounded-md border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                aria-label="Move seed down"
              >
                <ArrowDown size={15} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Brackets() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const canManage = user?.is_admin || user?.is_organizer;
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [venues, setVenues] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [seedIds, setSeedIds] = useState([]);
  const [bracket, setBracket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bracketLoading, setBracketLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingScheduleId, setSavingScheduleId] = useState(null);
  const [alert, setAlert] = useState(null);
  const [error, setError] = useState("");

  const selectedTournament = useMemo(
    () =>
      tournaments.find(
        (tournament) => String(tournament.id) === String(selectedTournamentId),
      ) || null,
    [selectedTournamentId, tournaments],
  );

  const approvedRegistrations = useMemo(() => {
    // Default seeding follows approval time so the first load is predictable.
    return registrations
      .filter(
        (registration) =>
          String(registration.turneu_id) === String(selectedTournamentId) &&
          registration.statusi === "Aprovuar",
      )
      .sort((a, b) => {
        const timeDiff = getRegistrationTime(a) - getRegistrationTime(b);
        if (timeDiff !== 0) return timeDiff;
        return Number(a.id || 0) - Number(b.id || 0);
      });
  }, [registrations, selectedTournamentId]);

  const approvedTeams = useMemo(
    () =>
      approvedRegistrations.map((registration) => ({
        id: registration.ekipi_id,
        emertimi: getRegistrationTeamName(registration),
      })),
    [approvedRegistrations],
  );

  const registrationOrderSeedIds = useMemo(
    () => approvedTeams.map((team) => team.id),
    [approvedTeams],
  );

  const loadBracket = useCallback(async (turneuId) => {
    if (!turneuId) {
      setBracket(null);
      return;
    }

    try {
      setBracketLoading(true);
      const response = await api.get(`/brackets/tournament/${turneuId}`);
      setBracket(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setBracket(null);
      } else {
        setAlert({
          type: "error",
          message:
            err.response?.data?.error ||
            err.message ||
            "Failed to load bracket.",
        });
      }
    } finally {
      setBracketLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!canManage) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");
        const [tournamentResponse, registrationResponse, venueResponse] =
          await Promise.all([
            api.get("/tournaments"),
            api.get("/tournament-registrations"),
            api.get("/venues"),
          ]);

        const nextTournaments = getArrayPayload(tournamentResponse.data);
        setTournaments(nextTournaments);
        setRegistrations(getArrayPayload(registrationResponse.data));
        setVenues(getArrayPayload(venueResponse.data));
        setSelectedTournamentId((current) =>
          current || (nextTournaments[0]?.id ? String(nextTournaments[0].id) : ""),
        );
      } catch (err) {
        setError(
          err.response?.data?.error ||
            err.message ||
            "Failed to load bracket data.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [authLoading, canManage]);

  useEffect(() => {
    setSeedIds(registrationOrderSeedIds);
  }, [registrationOrderSeedIds]);

  useEffect(() => {
    loadBracket(selectedTournamentId);
  }, [loadBracket, selectedTournamentId]);

  const handleMoveSeed = (index, direction) => {
    setSeedIds((prev) => moveItem(prev, index, direction));
  };

  const handleGenerate = async () => {
    if (!selectedTournamentId) return;
    if (seedIds.length < 2) {
      setAlert({
        type: "error",
        message: "At least two approved teams are required.",
      });
      return;
    }

    try {
      setSaving(true);
      // Sends the final seed order to the backend, where the actual bracket nodes are created.
      const response = await api.post(
        `/brackets/tournament/${selectedTournamentId}/generate`,
        {
          team_ids: seedIds,
        },
      );
      setBracket(response.data);
      setAlert({ type: "success", message: "Bracket generated successfully." });
    } catch (err) {
      setAlert({
        type: "error",
        message:
          err.response?.data?.error ||
          err.message ||
          "Failed to generate bracket.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleChange = async (match, schedulePayload) => {
    try {
      setSavingScheduleId(match.id);
      // Scheduling updates the bracket node and its linked real match together.
      const response = await api.patch(
        `/brackets/match/${match.id}/schedule`,
        {
          data_ndeshjes: schedulePayload.data_ndeshjes || null,
          ora_fillimit: schedulePayload.ora_fillimit || null,
          fusha_id: schedulePayload.fusha_id
            ? Number(schedulePayload.fusha_id)
            : null,
        },
      );
      setBracket(response.data);
      setAlert({ type: "success", message: "Match schedule saved." });
    } catch (err) {
      setAlert({
        type: "error",
        message:
          err.response?.data?.error ||
          err.message ||
          "Failed to save match schedule.",
      });
    } finally {
      setSavingScheduleId(null);
    }
  };

  const handleResetBracket = async () => {
    if (!selectedTournamentId) return;

    try {
      setSaving(true);
      await api.delete(`/brackets/tournament/${selectedTournamentId}`);
      setBracket(null);
      setAlert({ type: "success", message: "Bracket reset successfully." });
    } catch (err) {
      setAlert({
        type: "error",
        message:
          err.response?.data?.error ||
          err.message ||
          "Failed to reset bracket.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="delay-skeleton">
        <TableSkeleton />
      </div>
    );
  }

  if (!canManage) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-slate-950 sm:p-6">
      {alert && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}

      <div className="mx-auto max-w-7xl space-y-6">
        <section className={`${panel} overflow-hidden`}>
          <div className="border-b border-gray-200 bg-slate-900 p-5 text-white dark:border-slate-700 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase">
                  <GitBranch size={14} />
                  Knockout setup
                </div>
                <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                  Brackets
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-300">
                  Seed approved teams, schedule knockout matches, then advance winners when live matches are finished.
                </p>
              </div>
              <button
                type="button"
                onClick={() => loadBracket(selectedTournamentId)}
                disabled={bracketLoading}
                className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw size={16} className={bracketLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid gap-3 p-4 md:grid-cols-3 sm:p-5">
            <div className={`${panel} p-4 shadow-none`}>
              <p className={`text-xs font-bold uppercase ${mutedText}`}>Tournaments</p>
              <p className={`mt-1 text-2xl font-black ${strongText}`}>{tournaments.length}</p>
            </div>
            <div className={`${panel} p-4 shadow-none`}>
              <p className={`text-xs font-bold uppercase ${mutedText}`}>Approved Teams</p>
              <p className={`mt-1 text-2xl font-black ${strongText}`}>{approvedTeams.length}</p>
            </div>
            <div className={`${panel} p-4 shadow-none`}>
              <p className={`text-xs font-bold uppercase ${mutedText}`}>Rounds</p>
              <p className={`mt-1 text-2xl font-black ${strongText}`}>
                {bracket?.rounds?.length || 0}
              </p>
            </div>
          </div>
        </section>

        {error ? (
          <section className={`${panel} p-6 text-sm text-red-600 dark:text-red-300`}>
            {error}
          </section>
        ) : (
          <>
            <section className={`${panel} p-4 sm:p-5`}>
              <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-end">
                <label className="text-sm font-bold text-gray-700 dark:text-slate-300">
                  Tournament
                  <select
                    value={selectedTournamentId}
                    onChange={(event) => setSelectedTournamentId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="">Select tournament</option>
                    {tournaments.map((tournament) => (
                      <option key={tournament.id} value={tournament.id}>
                        {tournament.emertimi}
                      </option>
                    ))}
                  </select>
                </label>
                <p className={`text-sm ${mutedText}`}>
                  Generate pairings first. Schedule each playable match from its card.
                </p>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
              <section className={`${panel} p-4 sm:p-5`}>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className={`text-xl font-black ${strongText}`}>Seeds</h2>
                    <p className={`mt-1 text-sm ${mutedText}`}>
                      {selectedTournament?.emertimi || "Select a tournament"}
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                    {seedIds.length}
                  </span>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setSeedIds(shuffleIds(seedIds))}
                    disabled={seedIds.length < 2 || saving}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Dices size={16} />
                    Randomize
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeedIds(registrationOrderSeedIds)}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <RotateCcw size={16} />
                    Reset Order
                  </button>
                </div>

                <SeedList teams={approvedTeams} seedIds={seedIds} onMove={handleMoveSeed} />

                <div className="mt-5 grid gap-2">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={saving || !selectedTournamentId || seedIds.length < 2 || bracket?.matches?.length > 0}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    <Play size={16} />
                    Generate Bracket
                  </button>
                  <button
                    type="button"
                    onClick={handleResetBracket}
                    disabled={saving || !bracket?.matches?.length}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                  >
                    <Trash2 size={16} />
                    Reset Bracket
                  </button>
                </div>
              </section>

              <section className={`${panel} p-4 sm:p-5`}>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className={`text-xl font-black ${strongText}`}>Bracket Tree</h2>
                    <p className={`mt-1 text-sm ${mutedText}`}>
                      Start scheduled matches from live match tools, update the score, then finish the match to move winners forward.
                    </p>
                  </div>
                  {bracket?.champion ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                      <Trophy size={15} />
                      {bracket.champion.emertimi}
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-2 text-sm ${mutedText}`}>
                      <CalendarDays size={15} />
                      {bracket?.matches?.length ? "In progress" : "Not generated"}
                    </span>
                  )}
                </div>

                {bracketLoading ? (
                  <TableSkeleton />
                ) : (
                  <BracketTree
                    rounds={bracket?.rounds || []}
                    champion={bracket?.champion}
                    editable
                    venues={venues}
                    savingScheduleId={savingScheduleId}
                    onScheduleChange={handleScheduleChange}
                  />
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
