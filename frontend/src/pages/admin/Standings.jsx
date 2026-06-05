import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  ListOrdered,
  RefreshCcw,
  RotateCcw,
  Search,
  Shield,
  Trophy,
  Users,
  X,
} from "lucide-react";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";
import TableSkeleton from "../../components/Skeletons/TableSkeleton";

const panel =
  "rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800";
const strongText = "text-gray-900 dark:text-slate-100";
const mutedText = "text-gray-500 dark:text-slate-400";

// Animation variants for the standings page, defining how elements should animate when they appear on the screen.
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// Defines the animation for each individual item in the standings list, creating a fade-in and slight upward movement effect when they become visible.
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};
const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

// Utility function to extract an array of standings from the API response, handling different possible response structures gracefully.
function getArrayPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function getTeamName(standing) {
  return standing.team_name || standing.teams?.emertimi || "Unknown team";
}

function getTournamentName(group) {
  return group.tournamentName || `Tournament #${group.tournamentId}`;
}

function getSportName(standing, tournament) {
  return (
    standing?.sport_name ||
    standing?.tournaments?.sports?.emertimi ||
    tournament?.sports?.emertimi ||
    null
  );
}

// Calculates the goal difference for a standing, using the provided goal difference if available or computing it from goals scored and conceded as a fallback.
function getGoalDifference(standing) {
  if (
    standing.goal_difference !== undefined &&
    standing.goal_difference !== null
  ) {
    return Number(standing.goal_difference);
  }

  return (
    Number(standing.golat_shenuar || 0) - Number(standing.golat_pranuar || 0)
  );
}

function formatGoalDifference(value) {
  const parsed = Number(value || 0);
  return parsed > 0 ? `+${parsed}` : String(parsed);
}

function getRankClasses(rank) {
  if (rank === 1) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
  }
  if (rank === 2) {
    return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500/40 dark:bg-slate-500/10 dark:text-slate-200";
  }
  if (rank === 3) {
    return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300";
  }

  return "border-gray-200 bg-gray-50 text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
}

// Determines the appropriate text color classes for the goal difference value, using green for positive, red for negative, and gray for neutral values to visually indicate performance.
function getGdClasses(value) {
  const parsed = Number(value || 0);
  if (parsed > 0) return "text-emerald-600 dark:text-emerald-300";
  if (parsed < 0) return "text-red-600 dark:text-red-300";
  return "text-gray-500 dark:text-slate-400";
}

// Determines the appropriate background and text color classes for the form result indicators, using green for wins, red for losses, and gray for draws or no form to visually represent recent performance.
function getFormClasses(result) {
  if (result === "W")
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
  if (result === "L")
    return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
  return "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200";
}

function FormDots({ form }) {
  const results = Array.isArray(form) ? form : [];

  if (results.length === 0) {
    return <span className={`text-xs ${mutedText}`}>No form</span>;
  }

  return (
    <div className="flex items-center justify-center gap-1">
      {results.map((result, index) => (
        <span
          key={`${result}-${index}`}
          className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-black ${getFormClasses(result)}`}
        >
          {result}
        </span>
      ))}
    </div>
  );
}

// Component to display the rank badge for each team in the standings, applying different styles based on the team's rank to visually differentiate top performers from the rest of the standings.
function RankBadge({ rank }) {
  return (
    <span
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-sm font-black ${getRankClasses(rank)}`}
    >
      {rank}
    </span>
  );
}

// Component to display a statistic card with an icon, label, and value, used for showing key metrics or summary information in a visually appealing format on the standings page.
function StatCard({ icon, label, value }) {
  return (
    <div className={`${panel} p-4`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={`text-xs font-bold uppercase ${mutedText}`}>{label}</p>
          <p className={`mt-1 text-2xl font-black ${strongText}`}>{value}</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
          {icon}
        </div>
      </div>
    </div>
  );
}

// Component to display an empty state message with an optional icon.
function EmptyState({ title, description, icon }) {
  return (
    <div className={`${panel} p-8 text-center`}>
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-gray-50 text-gray-400 dark:bg-slate-900 dark:text-slate-500">
        {icon}
      </div>
      <p className={`font-bold ${strongText}`}>{title}</p>
      <p className={`mx-auto mt-1 max-w-xl text-sm ${mutedText}`}>
        {description}
      </p>
    </div>
  );
}

function StandingMobileCard({ standing }) {
  const rank = Number(standing.rank || 0);
  const gd = getGoalDifference(standing);

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <RankBadge rank={rank} />
          <div className="min-w-0">
            <p className={`truncate font-black ${strongText}`}>
              {getTeamName(standing)}
            </p>
            <p className={`mt-0.5 text-xs ${mutedText}`}>
              {standing.ndeshjet_luajtura} MP · {standing.fitoret}-
              {standing.barazimet}-{standing.humbjet}
            </p>
          </div>
        </div>
        <div className="rounded-xl bg-blue-50 px-3 py-2 text-center dark:bg-blue-500/10">
          <p className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-300">
            Pts
          </p>
          <p className="text-xl font-black text-blue-700 dark:text-blue-200">
            {standing.piket}
          </p>
        </div>
      </div>

      {/* Goal Stats */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-gray-50 p-2 dark:bg-slate-900">
          <p className={`text-xs ${mutedText}`}>GF</p>
          <p className={`font-bold ${strongText}`}>{standing.golat_shenuar}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2 dark:bg-slate-900">
          <p className={`text-xs ${mutedText}`}>GA</p>
          <p className={`font-bold ${strongText}`}>{standing.golat_pranuar}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2 dark:bg-slate-900">
          <p className={`text-xs ${mutedText}`}>GD</p>
          <p className={`font-bold ${getGdClasses(gd)}`}>
            {formatGoalDifference(gd)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className={`text-xs font-bold uppercase ${mutedText}`}>Form</span>
        <FormDots form={standing.form} />
      </div>
    </article>
  );
}

function StandingsTable({ rows }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[840px] text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-black uppercase text-gray-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
              <th className="px-4 py-3 text-center">Rank</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-3 py-3 text-center">MP</th>
              <th className="px-3 py-3 text-center">W</th>
              <th className="px-3 py-3 text-center">D</th>
              <th className="px-3 py-3 text-center">L</th>
              <th className="px-3 py-3 text-center">GF</th>
              <th className="px-3 py-3 text-center">GA</th>
              <th className="px-3 py-3 text-center">GD</th>
              <th className="px-3 py-3 text-center">Form</th>
              <th className="px-4 py-3 text-center">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {rows.map((standing) => {
              const gd = getGoalDifference(standing);

              return (
                <tr
                  key={standing.id}
                  className="transition hover:bg-blue-50/60 dark:hover:bg-slate-700/50"
                >
                  <td className="px-4 py-3 text-center">
                    <RankBadge rank={standing.rank} />
                  </td>
                  <td
                    className={`max-w-[280px] px-4 py-3 font-black ${strongText}`}
                  >
                    <span className="block truncate">
                      {getTeamName(standing)}
                    </span>
                  </td>
                  <td className={`px-3 py-3 text-center ${strongText}`}>
                    {standing.ndeshjet_luajtura}
                  </td>
                  <td className="px-3 py-3 text-center text-emerald-600 dark:text-emerald-300">
                    {standing.fitoret}
                  </td>
                  <td className={`px-3 py-3 text-center ${mutedText}`}>
                    {standing.barazimet}
                  </td>
                  <td className="px-3 py-3 text-center text-red-600 dark:text-red-300">
                    {standing.humbjet}
                  </td>
                  <td className={`px-3 py-3 text-center ${strongText}`}>
                    {standing.golat_shenuar}
                  </td>
                  <td className={`px-3 py-3 text-center ${strongText}`}>
                    {standing.golat_pranuar}
                  </td>
                  <td
                    className={`px-3 py-3 text-center font-bold ${getGdClasses(gd)}`}
                  >
                    {formatGoalDifference(gd)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <FormDots form={standing.form} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex min-w-12 justify-center rounded-xl bg-blue-600 px-3 py-1.5 text-base font-black text-white shadow-sm">
                      {standing.piket}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {rows.map((standing) => (
          <StandingMobileCard key={standing.id} standing={standing} />
        ))}
      </div>
    </>
  );
}

export default function Standings({ publicView = false }) {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [standings, setStandings] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alert, setAlert] = useState(null);
  const [filterTournament, setFilterTournament] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [recalculatingTournamentId, setRecalculatingTournamentId] =
    useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const canManage = !publicView && (user?.is_admin || user?.is_organizer);

  const fetchData = useCallback(
    async ({ quiet = false } = {}) => {
      try {
        if (quiet) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError("");

        const standingsRequest = publicView
          ? api.get("/standings/public")
          : api.get("/standings");
        const requests = [standingsRequest];

        if (!publicView) {
          requests.push(api.get("/tournaments"));
        }

        const [standingsResponse, tournamentsResponse] =
          await Promise.all(requests);
        setStandings(getArrayPayload(standingsResponse.data));
        setTournaments(
          publicView ? [] : getArrayPayload(tournamentsResponse?.data),
        );
      } catch (err) {
        setError(
          err.response?.data?.error ||
            err.message ||
            "Failed to load standings.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [publicView],
  );

  useEffect(() => {
    if (!publicView && authLoading) return;

    if (!publicView && !canManage) {
      setLoading(false);
      return;
    }

    fetchData();
  }, [authLoading, canManage, fetchData, publicView]);

  const tournamentOptions = useMemo(() => {
    const options = new Map();

    tournaments.forEach((tournament) => {
      options.set(String(tournament.id), {
        id: String(tournament.id),
        name: tournament.emertimi || `Tournament #${tournament.id}`,
        sportName: getSportName(null, tournament),
      });
    });

    standings.forEach((standing) => {
      const id = String(standing.turneu_id);
      if (!options.has(id)) {
        options.set(id, {
          id,
          name:
            standing.tournament_name ||
            standing.tournaments?.emertimi ||
            `Tournament #${id}`,
          sportName: getSportName(standing, null),
        });
      }
    });

    return Array.from(options.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [standings, tournaments]);

  const groupedStandings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const groups = new Map();

    if (!publicView && !query) {
      tournamentOptions.forEach((tournament) => {
        if (filterTournament && tournament.id !== filterTournament) return;

        groups.set(tournament.id, {
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          sportName: tournament.sportName,
          rows: [],
        });
      });
    }

    standings.forEach((standing) => {
      const tournamentId = String(standing.turneu_id);
      const teamName = getTeamName(standing).toLowerCase();
      const tournamentName = (
        standing.tournament_name ||
        standing.tournaments?.emertimi ||
        ""
      ).toLowerCase();
      const sportName = (getSportName(standing, null) || "").toLowerCase();

      if (filterTournament && tournamentId !== filterTournament) return;
      if (
        query &&
        !teamName.includes(query) &&
        !tournamentName.includes(query) &&
        !sportName.includes(query)
      ) {
        return;
      }

      const existing = groups.get(tournamentId);
      const group = existing || {
        tournamentId,
        tournamentName:
          standing.tournament_name ||
          standing.tournaments?.emertimi ||
          `Tournament #${tournamentId}`,
        sportName: getSportName(standing, null),
        rows: [],
      };

      group.rows.push(standing);
      if (!group.sportName) group.sportName = getSportName(standing, null);
      groups.set(tournamentId, group);
    });

    return Array.from(groups.values())
      .filter((group) => !query || group.rows.length > 0)
      .sort((a, b) => getTournamentName(a).localeCompare(getTournamentName(b)));
  }, [filterTournament, publicView, searchQuery, standings, tournamentOptions]);

  const totals = useMemo(() => {
    const teams = standings.length;
    const tournamentsCount = new Set(standings.map((item) => item.turneu_id))
      .size;
    const played = standings.reduce(
      (sum, item) => sum + Number(item.ndeshjet_luajtura || 0),
      0,
    );

    return {
      teams,
      tournaments: Math.max(tournamentsCount, tournamentOptions.length),
      matches: Math.floor(played / 2),
    };
  }, [standings, tournamentOptions.length]);

  const hasActiveFilters = Boolean(filterTournament || searchQuery.trim());

  const resetFilters = () => {
    setFilterTournament("");
    setSearchQuery("");
  };

  const handleRecalculate = async (turneuId) => {
    try {
      setRecalculatingTournamentId(turneuId);
      await api.post(`/standings/recalculate/${turneuId}`);
      await fetchData({ quiet: true });
      setAlert({
        type: "success",
        message: "Standings recalculated successfully.",
      });
    } catch (err) {
      setAlert({
        type: "error",
        message:
          err.response?.data?.error ||
          err.message ||
          "Failed to recalculate standings.",
      });
    } finally {
      setRecalculatingTournamentId(null);
    }
  };

  if (!publicView && authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg text-gray-600 dark:text-slate-300">
          Checking access...
        </p>
      </div>
    );
  }

  if (!publicView && !canManage) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="delay-skeleton">
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-slate-950 sm:p-6">
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="mx-auto w-full max-w-7xl space-y-6">
        <motion.section
          initial="hidden"
          animate="visible"
          variants={headerVariants}
          className={`${panel} overflow-hidden`}
        >
          <div className="border-b border-gray-200 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-5 text-white dark:border-slate-700 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase text-blue-100">
                  <ListOrdered size={14} />
                  {publicView ? "Public rankings" : "League management"}
                </div>
                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                  Standings
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-blue-100">
                  {publicView
                    ? "Follow tournament tables, recent form, and points as results are confirmed."
                    : "Review tournament tables, refresh rankings, and recalculate approved teams after result changes."}
                </p>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => fetchData({ quiet: true })}
                disabled={refreshing}
                className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
            <StatCard
              icon={<Trophy size={20} />}
              label="Tournaments"
              value={totals.tournaments}
            />
            <StatCard
              icon={<Users size={20} />}
              label="Ranked Teams"
              value={totals.teams}
            />
            <StatCard
              icon={<Activity size={20} />}
              label="Counted Matches"
              value={totals.matches}
            />
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          animate="visible"
          variants={headerVariants}
          transition={{ delay: 0.1 }}
          className={`${panel} p-4 sm:p-5`}
        >
          <div className="grid gap-3 lg:grid-cols-[220px_1fr_auto]">
            <label className="text-sm font-bold text-gray-700 dark:text-slate-300">
              Tournament
              <select
                value={filterTournament}
                onChange={(event) => setFilterTournament(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
              >
                <option value="">All tournaments</option>
                {tournamentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            {/* Search */}
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
                  placeholder="Search team, tournament, or sport..."
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                />
              </div>
            </label>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-all flex items-center justify-center gap-1 shrink-0 animate-in fade-in slide-in-from-left-2 duration-200 cursor-pointer ml-auto sm:ml-0 mt-3"
            >
              Clear Filters
            </button>
          )}
        </motion.section>

        {error ? (
          <EmptyState
            icon={<BarChart3 size={22} />}
            title="Could not load standings"
            description={error}
          />
        ) : groupedStandings.length === 0 ? (
          <EmptyState
            icon={<Shield size={22} />}
            title={
              hasActiveFilters
                ? "No standings match your filters"
                : "No standings yet"
            }
            description={
              hasActiveFilters
                ? "Try a different team, sport, or tournament search."
                : publicView
                  ? "Standings will appear here after tournament results are published."
                  : "Use Recalculate after approving teams or adding match results."
            }
          />
        ) : (
          <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {groupedStandings.map((group) => {
              const isRecalculating =
                String(recalculatingTournamentId) ===
                String(group.tournamentId);

              return (
                <motion.section
                  key={group.tournamentId}
                  variants={itemVariants}
                  className={`${panel} overflow-hidden`}
                >
                  <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2
                          className={`truncate text-xl font-black ${strongText}`}
                        >
                          {getTournamentName(group)}
                        </h2>
                        {group.sportName && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                            <Trophy size={13} />
                            {group.sportName}
                          </span>
                        )}
                      </div>
                      <p className={`mt-1 text-sm ${mutedText}`}>
                        {group.rows.length} ranked team
                        {group.rows.length === 1 ? "" : "s"}
                      </p>
                    </div>

                    {/* Recalculate Button */}
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleRecalculate(group.tournamentId)}
                        disabled={isRecalculating || refreshing}
                        className="inline-flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                      >
                        <RotateCcw
                          size={16}
                          className={isRecalculating ? "animate-spin" : ""}
                        />
                        {isRecalculating ? "Recalculating..." : "Recalculate"}
                      </button>
                    )}
                  </div>

                  {group.rows.length > 0 ? (
                    <StandingsTable rows={group.rows} />
                  ) : (
                    <div className="p-5">
                      <EmptyState
                        icon={<Shield size={22} />}
                        title="No standings rows yet"
                        description="Approved teams will appear here after recalculation, even before they play."
                      />
                    </div>
                  )}
                </motion.section>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
