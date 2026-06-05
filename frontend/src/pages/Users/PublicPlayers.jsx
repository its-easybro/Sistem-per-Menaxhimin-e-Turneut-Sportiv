import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X, User, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../config/axiosInstance";
import { API_BASE_URL } from "../../config/api";
import CardSkeleton from "../../components/Skeletons/CardSkeleton";

const panel =
  "rounded-lg border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800";
const strongText = "text-gray-900 dark:text-slate-100";
const mutedText = "text-gray-500 dark:text-slate-400";

// --- Animation Variants ---
const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const statCardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

// Utility function to resolve the correct URL for a player's photo, handling various formats and edge cases to ensure a valid image source is returned for display in the player directory.
const resolvePlayerFoto = (playerFoto) => {
  if (!playerFoto || typeof playerFoto !== "string") return "";
  const trimmed = playerFoto.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/players/uploads-players/"))
    return `${API_BASE_URL}${trimmed}`;
  if (trimmed.startsWith("/uploads-players/"))
    return `${API_BASE_URL}${trimmed}`;
  return `${API_BASE_URL}/players/uploads-players/${trimmed}`;
};

export default function PublicPlayers() {
  const [players, setPlayers] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    sporti_id: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        const [playersRes, sportsRes] = await Promise.all([
          api.get("/players/public"),
          api.get("/sports/public"),
        ]);

        setPlayers(Array.isArray(playersRes.data) ? playersRes.data : []);
        setSports(Array.isArray(sportsRes.data) ? sportsRes.data : []);
      } catch (err) {
        setError(
          err.response?.data?.error ||
            err.message ||
            "Failed to load players data.",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClearFilters = () => {
    setFilters({ search: "", sporti_id: "" });
  };

  const hasActiveFilters =
    filters.search.trim() !== "" || filters.sporti_id !== "";

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const searchMatch =
        filters.search === "" ||
        `${player.emri} ${player.mbiemri}`
          .toLowerCase()
          .includes(filters.search.toLowerCase()) ||
        player.ekipi_emri.toLowerCase().includes(filters.search.toLowerCase());

      const sportMatch =
        filters.sporti_id === "" ||
        String(player.sporti_id) === String(filters.sporti_id);

      return searchMatch && sportMatch;
    });
  }, [players, filters]);

  // Group by sport, then by team
  const groupedPlayers = useMemo(() => {
    const groups = {};

    filteredPlayers.forEach((player) => {
      const sportName = player.sporti_emri || "Unknown Sport";
      const teamName = player.ekipi_emri || "Unknown Team";

      if (!groups[sportName]) {
        groups[sportName] = { teams: {}, count: 0 };
      }
      if (!groups[sportName].teams[teamName]) {
        groups[sportName].teams[teamName] = [];
      }
      groups[sportName].teams[teamName].push(player);
      groups[sportName].count++;
    });

    return groups;
  }, [filteredPlayers]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 dark:bg-slate-950 sm:p-6">
        <div className="mx-auto max-w-7xl">
          <CardSkeleton />
          <div className="mt-6">
            <CardSkeleton />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 text-gray-900 dark:bg-slate-950 dark:text-slate-100 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER SECTION */}
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
                  <User size={14} />
                  Player Directory
                </div>
                <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                  Players & Teams
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-blue-100">
                  Browse through all the players grouped by their respective
                  sports and teams.
                </p>
              </div>
            </div>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5"
          >
            <motion.div
              variants={statCardVariants}
              className="rounded-lg border border-gray-200 p-4 dark:border-slate-700"
            >
              <p className={`text-xs font-bold uppercase ${mutedText}`}>
                Total Players
              </p>
              <p className={`mt-1 text-2xl font-black ${strongText}`}>
                {players.length}
              </p>
            </motion.div>
            <motion.div
              variants={statCardVariants}
              className="rounded-lg border border-gray-200 p-4 dark:border-slate-700"
            >
              <p className={`text-xs font-bold uppercase ${mutedText}`}>
                Active Teams
              </p>
              <p className={`mt-1 text-2xl font-black ${strongText}`}>
                {
                  new Set(
                    players.filter((p) => p.team_id).map((p) => p.team_id),
                  ).size
                }
              </p>
            </motion.div>
            <motion.div
              variants={statCardVariants}
              className="rounded-lg border border-gray-200 p-4 dark:border-slate-700"
            >
              <p className={`text-xs font-bold uppercase ${mutedText}`}>
                Sports
              </p>
              <p className={`mt-1 text-2xl font-black ${strongText}`}>
                {
                  new Set(
                    players.filter((p) => p.sporti_id).map((p) => p.sporti_id),
                  ).size
                }
              </p>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* FILTERS SECTION */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={headerVariants}
          transition={{ delay: 0.1 }}
        >
          <div className={`${panel} p-4 shadow-sm flex flex-col gap-4`}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search
                    size={18}
                    className="text-gray-400 dark:text-gray-500"
                  />
                </div>
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Search player or team..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition-all placeholder-gray-400"
                />
              </div>

              <div className="relative min-w-[160px] flex-1 sm:flex-none">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <SlidersHorizontal size={14} />
                </div>
                <select
                  name="sporti_id"
                  value={filters.sporti_id}
                  onChange={handleFilterChange}
                  className="w-full pl-9 pr-8 py-2 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer font-medium transition-all"
                >
                  <option value="">All Sports</option>
                  {sports.map((sport) => (
                    <option key={sport.id} value={sport.id}>
                      {sport.emertimi}
                    </option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="text-xs font-semibold text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-all flex items-center justify-center gap-1 shrink-0 animate-in fade-in slide-in-from-left-2 duration-200 cursor-pointer ml-auto"
                >
                  <X size={16} />
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </motion.section>

        {/* ERROR STATE */}
        {error && (
          <div className={`${panel} p-8 text-center`}>
            <p className="text-red-500 dark:text-red-400 font-medium">
              {error}
            </p>
          </div>
        )}

        {/* PLAYERS LISTING */}
        {!error && Object.keys(groupedPlayers).length === 0 ? (
          <div className={`${panel} p-8 text-center`}>
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-lg bg-gray-50 text-gray-400 dark:bg-slate-900 dark:text-slate-500">
              <User size={22} />
            </div>
            <p className={`font-black ${strongText}`}>No players found</p>
            <p className={`mx-auto mt-1 max-w-xl text-sm ${mutedText}`}>
              {hasActiveFilters
                ? "Try adjusting your filters or search query."
                : "There are currently no players registered."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <AnimatePresence>
              {Object.entries(groupedPlayers).map(([sportName, sportData]) => (
                <motion.div
                  key={sportName}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Sport Header */}
                  <div className="flex items-center gap-3 border-b border-gray-200 dark:border-slate-800 pb-2">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                      {sportName}
                    </h2>
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {sportData.count} Players
                    </span>
                  </div>

                  {/* Teams within the sport */}
                  <div className="grid gap-6">
                    {Object.entries(sportData.teams).map(
                      ([teamName, teamPlayers]) => (
                        <div
                          key={teamName}
                          className={`${panel} overflow-hidden`}
                        >
                          <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-200 dark:bg-slate-800/80 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shield
                                size={18}
                                className="text-blue-600 dark:text-blue-400"
                              />
                              <h3 className="font-bold text-gray-900 dark:text-slate-100 text-lg">
                                {teamName}
                              </h3>
                            </div>
                            <span className="text-sm font-medium text-gray-500 dark:text-slate-400">
                              {teamPlayers.length} Members
                            </span>
                          </div>

                          <div className="grid gap-px bg-gray-200 dark:bg-slate-700 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {teamPlayers.map((player) => (
                              <div
                                key={player.id}
                                className="bg-white dark:bg-slate-800 p-4 flex flex-col items-center text-center transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/60"
                              >
                                <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-slate-900 overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm mb-3 relative">
                                  {player.foto ? (
                                    <img
                                      src={resolvePlayerFoto(player.foto)}
                                      alt={`${player.emri} ${player.mbiemri}`}
                                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src =
                                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'/%3E%3C/svg%3E";
                                      }}
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-gray-400">
                                      <User size={28} />
                                    </div>
                                  )}
                                </div>
                                <h4 className="font-bold text-gray-900 dark:text-slate-100 truncate w-full">
                                  {player.emri} {player.mbiemri}
                                </h4>
                                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                                  {player.pozicioni || "Player"}
                                </p>
                                {player.numri && (
                                  <div className="mt-2 text-xs font-bold bg-gray-100 dark:bg-slate-900 text-gray-700 dark:text-slate-300 px-2 py-1 rounded-md">
                                    #{player.numri}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}
