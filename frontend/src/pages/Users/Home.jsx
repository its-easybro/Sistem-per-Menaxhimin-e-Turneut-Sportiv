import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  Clock3,
  Crown,
  Flame,
  Medal,
  Search,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Waves,
  Zap,
} from "lucide-react";
import api from "../../config/axiosInstance";
import AuthContext from "../../context/AuthContext";

const dashboardShell =
  "min-h-screen overflow-hidden bg-slate-950 text-slate-100 transition-colors duration-300";
const panel =
  "rounded-3xl border border-white/10 bg-white/5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-300 dark:border-slate-700/70 dark:bg-slate-800/80";
const subtlePanel =
  "rounded-2xl border border-white/8 bg-white/5 backdrop-blur-md transition-all duration-300 dark:border-slate-700 dark:bg-slate-800/70";

const sportIconMap = [
  { match: /football|futboll|soccer/i, icon: Target },
  { match: /basket/i, icon: BarChart3 },
  { match: /volley/i, icon: Shield },
  { match: /tennis/i, icon: Sparkles },
  { match: /swim|water/i, icon: Waves },
  { match: /combat|fight|martial/i, icon: Shield },
  { match: /run|athletic|track/i, icon: Zap },
];

function getInitials(name) {
  return (
    String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "?"
  );
}

function formatDate(value) {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "--:--";
  const text = String(value);
  if (text.includes("T")) return text.slice(11, 16);
  return text.slice(0, 5);
}

function formatScore(score) {
  if (!score) return "0 - 0";
  return `${score.home ?? 0} - ${score.away ?? 0}`;
}

function getElapsedLabel(match) {
  if (match?.elapsedMinutes === null || match?.elapsedMinutes === undefined) {
    return "Live";
  }

  return `${match.elapsedMinutes} min`;
}

function getCTA(user) {
  const role =
    user?.roli ||
    (user?.is_organizer
      ? "organizator"
      : user?.is_referee
        ? "gjyqtar"
        : user?.is_admin
          ? "admin"
          : null);

  if (role === "organizator") {
    return { label: "Manage Tournaments", to: "/organizer/tournaments" };
  }

  if (role === "gjyqtar") {
    return { label: "Upcoming Matches", to: "/referee/matches" };
  }

  return { label: "Browse Live Tournaments", to: "/live-matches" };
}

function getSportIcon(name) {
  const match = sportIconMap.find((entry) => entry.match.test(name || ""));
  return match?.icon || Trophy;
}

function MiniAvatar({ name, logo }) {
  if (logo) {
    return <img src={logo} alt={name} className="h-full w-full object-cover" />;
  }

  return <span>{getInitials(name)}</span>;
}

function Home() {
  const { user } = useContext(AuthContext);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [viewMode, setViewMode] = useState("results");
  const [selectedStandingId, setSelectedStandingId] = useState(null);

  const cta = useMemo(() => getCTA(user), [user]);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        const response = await api.get("/dashboard/home");

        if (!active) return;

        setDashboard(response.data);
        setSelectedStandingId(
          response.data?.standingsPreview?.[0]?.tournamentId || null,
        );
      } catch (loadError) {
        if (!active) return;

        setError(loadError?.message || "Failed to load dashboard");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const term = query.trim();

    if (term.length < 2) {
      setSearchResults(null);
      setSearchLoading(false);
      return undefined;
    }

    let active = true;
    setSearchLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const response = await api.get("/dashboard/search", { params: { q: term } });

        if (!active) return;

        setSearchResults(response.data);
      } catch (searchError) {
        if (!active) return;

        setSearchResults({ error: searchError?.message || "Search failed" });
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const activeStandings = dashboard?.standingsPreview || [];
  const selectedStandings =
    activeStandings.find((item) => item.tournamentId === selectedStandingId) ||
    activeStandings[0] ||
    null;
  const resultsList =
    viewMode === "results"
      ? dashboard?.recentResults || []
      : dashboard?.upcomingMatches || [];
  const spotlight = dashboard?.spotlight || { recentMvp: [], topScorers: [] };
  const searchVisible = Boolean(query.trim()) && (searchResults || searchLoading);

  return (
    <div className={dashboardShell}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-12rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute right-[-8rem] top-32 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
      </div>

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative rounded-[2rem] border border-white/10 bg-slate-900/90 px-6 py-8 shadow-2xl shadow-black/30 sm:px-8 lg:px-10">
        <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_24%),linear-gradient(135deg,rgba(2,6,23,0.98),rgba(15,23,42,0.92))]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:36px_36px] opacity-20" />
        </div>
          <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
                <Flame className="h-3.5 w-3.5" />
                Tournament Control Center
              </div>

              <div className="max-w-3xl space-y-4">
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Manage tournaments, track live matches, and surface the numbers that matter.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  Monitor live fixtures, review standings, and search tournaments,
                  teams, and players from one dashboard.
                </p>
              </div>

              <div className="relative max-w-3xl">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 shadow-lg shadow-black/20 backdrop-blur-md">
                  <Search className="h-5 w-5 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search tournaments, teams, players..."
                    className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none sm:text-base"
                  />
                </div>

                {searchVisible && (
                  <div className="absolute z-20 mt-3 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
                    <div className="border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Search results
                    </div>

                    {searchLoading ? (
                      <div className="px-4 py-6 text-sm text-slate-400">Searching...</div>
                    ) : searchResults?.error ? (
                      <div className="px-4 py-6 text-sm text-rose-300">{searchResults.error}</div>
                    ) : (
                      <div className="grid gap-4 p-4 md:grid-cols-3">
                        {[
                          {
                            title: "Tournaments",
                            items: searchResults?.tournaments || [],
                            icon: Trophy,
                          },
                          { title: "Teams", items: searchResults?.teams || [], icon: Users },
                          { title: "Players", items: searchResults?.players || [], icon: Medal },
                        ].map((group) => (
                          <div key={group.title} className={subtlePanel}>
                            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                              <span className="flex items-center gap-2 text-sm font-semibold text-white">
                                <group.icon className="h-4 w-4 text-emerald-300" />
                                {group.title}
                              </span>
                              <span className="text-xs text-slate-400">{group.items.length}</span>
                            </div>

                            <div className="space-y-2 p-3">
                              {group.items.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm text-slate-500">
                                  No matches found.
                                </div>
                              ) : (
                                group.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="rounded-xl border border-white/8 bg-white/5 px-3 py-3 transition hover:border-emerald-400/25 hover:bg-white/8"
                                  >
                                    <div className="text-sm font-semibold text-white">
                                      {item.label || item.emertimi || item.name}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-400">
                                      {item.subtitle || item.sport || item.qyteti || item.position || item.dateRange || ""}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex h-full flex-col justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Hello
                </div>
                <div className="mt-2 text-2xl font-bold text-white">
                  {user?.emri || user?.full_name || "Guest"}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Your dashboard adapts to your role and keeps the most important
                  actions within reach.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={cta.to}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5"
                >
                  {cta.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/public/standings"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Public standings
                </Link>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <section className={`${panel} border-rose-400/20 bg-rose-500/10 px-5 py-4 text-rose-100`}>
            {error}
          </section>
        )}

        <section className={`${panel} p-5`}>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            <Activity className="h-4 w-4 text-red-400" />
            Live Matches
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-36 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : dashboard?.liveMatches?.length ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {dashboard.liveMatches.map((match) => (
                <article
                  key={match.id}
                  className="min-w-[280px] flex-1 rounded-2xl border border-red-400/20 bg-gradient-to-br from-red-500/10 to-slate-900/80 p-4 shadow-[0_14px_50px_rgba(239,68,68,0.08)]"
                >
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    <span className="inline-flex items-center gap-2 text-red-300">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                      </span>
                      Live
                    </span>
                    <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2 py-1 text-[11px] text-red-100">
                      {getElapsedLabel(match)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 text-left">
                      <div className="truncate text-sm font-semibold text-white">
                        {match.homeTeam?.emertimi}
                      </div>
                      <div className="truncate text-xs text-slate-400">Home</div>
                    </div>

                    <div className="rounded-2xl bg-white/10 px-4 py-2 text-xl font-black text-white">
                      {formatScore(match.score)}
                    </div>

                    <div className="min-w-0 flex-1 text-right">
                      <div className="truncate text-sm font-semibold text-white">
                        {match.awayTeam?.emertimi}
                      </div>
                      <div className="truncate text-xs text-slate-400">Away</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span>{match.tournamentName}</span>
                    <span>
                      {match.ora_fillimit
                        ? formatTime(match.ora_fillimit)
                        : "TBD"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-sm text-slate-400">
              No live matches at the moment.
            </div>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Tournaments",
              value: dashboard?.stats?.tournaments || 0,
              icon: Trophy,
              accent: "from-emerald-400 to-teal-400",
            },
            {
              label: "Teams",
              value: dashboard?.stats?.teams || 0,
              icon: Users,
              accent: "from-cyan-400 to-blue-400",
            },
            {
              label: "Matches Played",
              value: dashboard?.stats?.matchesPlayed || 0,
              icon: Trophy,
              accent: "from-amber-400 to-orange-400",
            },
            {
              label: "Registered Players",
              value: dashboard?.stats?.registeredPlayers || 0,
              icon: Crown,
              accent: "from-fuchsia-400 to-pink-400",
            },
          ].map((item) => (
            <div key={item.label} className={`${panel} flex items-center gap-4 p-5`}>
              <div className={`rounded-2xl bg-gradient-to-br ${item.accent} p-3 text-slate-950`}>
                <item.icon className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm text-slate-400">{item.label}</div>
                <div className="text-3xl font-black text-white">{item.value}</div>
              </div>
            </div>
          ))}
        </section>

        <section id="active-tournaments" className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                Active tournaments
              </div>
              <h2 className="mt-2 text-2xl font-bold text-white">
                Live competition across the current season
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-44 animate-pulse rounded-3xl bg-white/5" />
              ))}
            </div>
          ) : dashboard?.activeTournaments?.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {dashboard.activeTournaments.map((tournament) => {
                const SportIcon = getSportIcon(
                  tournament.sport?.emertimi || tournament.sport?.lloji,
                );

                return (
                  <article key={tournament.id} className={`${panel} p-5 hover:-translate-y-1`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
                        <SportIcon className="h-6 w-6" />
                      </div>
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                        {tournament.statusi}
                      </span>
                    </div>

                    <h3 className="mt-4 text-xl font-bold text-white">{tournament.emertimi}</h3>
                    <p className="mt-2 text-sm text-slate-400">
                      {tournament.sport?.emertimi || "Sport"}
                    </p>

                    <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
                      <span>
                        {tournament.data_fillimit && tournament.data_perfundimit
                          ? `${formatDate(tournament.data_fillimit)} - ${formatDate(tournament.data_perfundimit)}`
                          : "Season ongoing"}
                      </span>
                      <span className="inline-flex items-center gap-2 text-slate-400">
                        <CalendarDays className="h-4 w-4" />
                        {tournament.matchesCount || 0} matches
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 px-5 py-10 text-sm text-slate-400">
              No active tournaments yet.
            </div>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className={`${panel} p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Match feed
                </div>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  Recent results and upcoming fixtures
                </h2>
              </div>

              <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
                {[
                  { key: "results", label: "Recent Results" },
                  { key: "upcoming", label: "Upcoming Matches" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setViewMode(item.key)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      viewMode === item.key
                        ? "bg-white text-slate-950 shadow-lg"
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="grid gap-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-20 animate-pulse rounded-2xl bg-white/5" />
                  ))}
                </div>
              ) : resultsList.length ? (
                resultsList.map((match) => (
                  <article
                    key={match.id}
                    className={`${subtlePanel} flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatDate(match.data_ndeshjes)}
                      </div>

                      <div className="mt-2 flex items-center gap-3 text-sm font-semibold text-white">
                        <span className="truncate">{match.homeTeam?.emertimi || "Home"}</span>
                        <span className="text-slate-500">vs</span>
                        <span className="truncate">{match.awayTeam?.emertimi || "Away"}</span>
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        {match.tournamentName || "Tournament"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/8 px-4 py-3 text-right">
                      {viewMode === "results" ? (
                        <div className="text-lg font-black text-white">
                          {formatScore(match.score)}
                        </div>
                      ) : (
                        <div className="text-lg font-black text-white">
                          {formatTime(match.ora_fillimit)}
                        </div>
                      )}
                      <div className="text-xs text-slate-400">
                        {viewMode === "results" ? "Final score" : "Kickoff"}
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-sm text-slate-400">
                  No {viewMode === "results" ? "results" : "upcoming matches"} available.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className={`${panel} p-5`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Standings
                  </div>
                  <h3 className="mt-2 text-xl font-bold text-white">
                    Top teams by active tournament
                  </h3>
                </div>
                <BadgeCheck className="h-5 w-5 text-emerald-300" />
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {activeStandings.map((tournament) => (
                  <button
                    key={tournament.tournamentId}
                    type="button"
                    onClick={() => setSelectedStandingId(tournament.tournamentId)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                      selectedStandings?.tournamentId === tournament.tournamentId
                        ? "bg-emerald-400 text-slate-950"
                        : "bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {tournament.tournamentName || "Tournament"}
                  </button>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                {selectedStandings?.rows?.length ? (
                  selectedStandings.rows.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3"
                    >
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-sm font-black text-white">
                        {row.rank}
                      </div>

                      <div className="h-10 w-10 overflow-hidden rounded-xl border border-white/10 bg-slate-900/70 text-sm font-bold text-white">
                        <MiniAvatar name={row.teamName} logo={row.teamLogo} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">
                          {row.teamName}
                        </div>
                        <div className="text-xs text-slate-400">{row.played} played</div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-black text-emerald-300">
                          {row.points} pts
                        </div>
                        <div className="text-xs text-slate-400">
                          GD {row.goalsFor - row.goalsAgainst}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-sm text-slate-400">
                    Standings are not available for this tournament yet.
                  </div>
                )}
              </div>
            </div>

            <div className={`${panel} p-5`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Spotlight
                  </div>
                  <h3 className="mt-2 text-xl font-bold text-white">
                    MVPs and goal leaders
                  </h3>
                </div>
                <Star className="h-5 w-5 text-amber-300" />
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Recent MVPs
                  </div>

                  <div className="space-y-3">
                    {spotlight.recentMvp.length ? (
                      spotlight.recentMvp.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3"
                        >
                          <div className="h-11 w-11 overflow-hidden rounded-full border border-white/10 bg-slate-900 text-xs font-bold text-white">
                            <MiniAvatar name={item.player?.name} logo={item.player?.foto} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-white">
                              {item.player?.name}
                            </div>
                            <div className="truncate text-xs text-slate-400">
                              {item.tournamentName}
                            </div>
                          </div>
                          <div className="text-right text-xs text-slate-400">
                            <div>{formatScore(item.score)}</div>
                            <div>{formatDate(item.data_ndeshjes)}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-400">
                        No MVP data yet.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Top scorers
                  </div>

                  <div className="space-y-3">
                    {spotlight.topScorers.length ? (
                      spotlight.topScorers.slice(0, 3).map((item, index) => (
                        <div
                          key={`${item.playerId || item.playerName}-${index}`}
                          className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3"
                        >
                          <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-sm font-black text-slate-950">
                            {item.goals}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-white">
                              {item.playerName}
                            </div>
                            <div className="truncate text-xs text-slate-400">
                              {item.teamName || "Independent"}
                            </div>
                          </div>
                          <Medal className="h-4 w-4 text-amber-300" />
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-400">
                        No top scorer data yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={`${panel} p-5`}>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            Supported sports
          </div>

          <div className="flex flex-wrap gap-3">
            {dashboard?.sports?.length ? (
              dashboard.sports.map((sport) => {
                const SportIcon = getSportIcon(sport.emertimi || sport.lloji);

                return (
                  <div
                    key={sport.id}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200"
                  >
                    <SportIcon className="h-4 w-4 text-emerald-300" />
                    <span>{sport.emertimi}</span>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-slate-400">No sports available.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home;
