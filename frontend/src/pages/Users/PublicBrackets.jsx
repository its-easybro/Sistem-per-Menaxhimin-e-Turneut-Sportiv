import { useCallback, useEffect, useMemo, useState } from "react";
import { GitBranch, RefreshCcw, Search, Trophy } from "lucide-react";
import api from "../../config/axiosInstance";
import BracketTree from "../../components/BracketTree";
import CardSkeleton from "../../components/Skeletons/CardSkeleton";

const panel =
  "rounded-lg border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800";
const strongText = "text-gray-900 dark:text-slate-100";
const mutedText = "text-gray-500 dark:text-slate-400";

function getArrayPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function EmptyState({ title, description }) {
  return (
    <div className={`${panel} p-8 text-center`}>
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-lg bg-gray-50 text-gray-400 dark:bg-slate-900 dark:text-slate-500">
        <GitBranch size={22} />
      </div>
      <p className={`font-black ${strongText}`}>{title}</p>
      <p className={`mx-auto mt-1 max-w-xl text-sm ${mutedText}`}>{description}</p>
    </div>
  );
}

export default function PublicBrackets() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [bracket, setBracket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bracketLoading, setBracketLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const selectedTournament = useMemo(
    () =>
      tournaments.find(
        (tournament) => String(tournament.id) === String(selectedTournamentId),
      ) || null,
    [selectedTournamentId, tournaments],
  );

  const filteredTournaments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return tournaments;

    return tournaments.filter((tournament) =>
      [
        tournament.emertimi,
        tournament.sport_emri,
        tournament.statusi,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [searchQuery, tournaments]);

  const loadBracket = useCallback(async (turneuId) => {
    if (!turneuId) {
      setBracket(null);
      return;
    }

    try {
      setBracketLoading(true);
      setError("");
      const response = await api.get(`/brackets/public/tournament/${turneuId}`);
      setBracket(response.data);
    } catch (err) {
      setBracket(null);
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to load bracket.",
      );
    } finally {
      setBracketLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadTournaments = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/brackets/public/tournaments");
        const nextTournaments = getArrayPayload(response.data);
        setTournaments(nextTournaments);
        setSelectedTournamentId(() => {
          const bracketTournament =
            nextTournaments.find((tournament) => tournament.has_bracket) ||
            nextTournaments[0];
          return bracketTournament?.id ? String(bracketTournament.id) : "";
        });
      } catch (err) {
        setError(
          err.response?.data?.error ||
            err.message ||
            "Failed to load tournaments.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadTournaments();
  }, []);

  useEffect(() => {
    loadBracket(selectedTournamentId);
  }, [loadBracket, selectedTournamentId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 dark:bg-slate-950 sm:p-6">
        <div className="mx-auto max-w-7xl">
          <CardSkeleton />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 text-gray-900 dark:bg-slate-950 dark:text-slate-100 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className={`${panel} overflow-hidden`}>
          <div className="border-b border-gray-200 bg-slate-900 p-5 text-white dark:border-slate-700 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase">
                  <GitBranch size={14} />
                  Public bracket
                </div>
                <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                  Tournament Brackets
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-300">
                  Follow knockout rounds, scores, winners, and the champion once the final is complete.
                </p>
              </div>
              <button
                type="button"
                onClick={() => loadBracket(selectedTournamentId)}
                disabled={bracketLoading || !selectedTournamentId}
                className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw size={16} className={bracketLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
            <div className="rounded-lg border border-gray-200 p-4 dark:border-slate-700">
              <p className={`text-xs font-bold uppercase ${mutedText}`}>Tournaments</p>
              <p className={`mt-1 text-2xl font-black ${strongText}`}>{tournaments.length}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4 dark:border-slate-700">
              <p className={`text-xs font-bold uppercase ${mutedText}`}>With Brackets</p>
              <p className={`mt-1 text-2xl font-black ${strongText}`}>
                {tournaments.filter((tournament) => tournament.has_bracket).length}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4 dark:border-slate-700">
              <p className={`text-xs font-bold uppercase ${mutedText}`}>Champion</p>
              <p className={`mt-1 truncate text-2xl font-black ${strongText}`}>
                {bracket?.champion?.emertimi || "TBD"}
              </p>
            </div>
          </div>
        </section>

        <section className={`${panel} p-4 sm:p-5`}>
          <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
            <label className="text-sm font-bold text-gray-700 dark:text-slate-300">
              Tournament
              <select
                value={selectedTournamentId}
                onChange={(event) => setSelectedTournamentId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">Select tournament</option>
                {filteredTournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.emertimi}
                    {tournament.has_bracket ? "" : " (no bracket)"}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold text-gray-700 dark:text-slate-300">
              Search
              <div className="relative mt-1">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search tournament or sport"
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </label>
          </div>
        </section>

        {error ? (
          <EmptyState title="Could not load bracket" description={error} />
        ) : !selectedTournament ? (
          <EmptyState
            title="No tournament selected"
            description="Choose a tournament to view its knockout bracket."
          />
        ) : bracketLoading ? (
          <CardSkeleton />
        ) : !bracket?.matches?.length ? (
          <EmptyState
            title="No bracket published"
            description={`${selectedTournament.emertimi} does not have a generated bracket yet.`}
          />
        ) : (
          <section className={`${panel} p-4 sm:p-5`}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className={`text-xl font-black ${strongText}`}>
                  {selectedTournament.emertimi}
                </h2>
                <p className={`mt-1 text-sm ${mutedText}`}>
                  {selectedTournament.sport_emri || "Tournament"}
                </p>
              </div>
              {bracket.champion ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  <Trophy size={15} />
                  {bracket.champion.emertimi}
                </span>
              ) : (
                <span className={`text-sm font-semibold ${mutedText}`}>
                  Champion TBD
                </span>
              )}
            </div>

            <BracketTree rounds={bracket.rounds || []} champion={bracket.champion} />
          </section>
        )}
      </div>
    </main>
  );
}
