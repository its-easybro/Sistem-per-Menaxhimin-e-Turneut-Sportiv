import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import api from "../../config/axiosInstance";
import { Alert } from "../../components/Alert";
import TableSkeleton from "../../components/Skeletons/TableSkeleton"

export default function Standings() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [standings, setStandings] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alert, setAlert] = useState(null);
  const [filterTournament, setFilterTournament] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [recalculatingTournamentId, setRecalculatingTournamentId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [standingsResponse, tournamentsResponse] = await Promise.all([
        api.get("/standings"),
        api.get("/tournaments"),
      ]);

      setStandings(standingsResponse.data || []);
      setTournaments(tournamentsResponse.data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to load standings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.is_admin) {
      setLoading(false);
      return;
    }

    fetchData();
  }, [user, fetchData]);

  const groupedStandings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const grouped = new Map();

    for (const item of standings) {
      const tournamentId = String(item.turneu_id);
      const teamName = (item.teams?.emertimi || "").toLowerCase();

      if (filterTournament && tournamentId !== filterTournament) {
        continue;
      }
      if (query && !teamName.includes(query)) {
        continue;
      }

      if (!grouped.has(tournamentId)) {
        grouped.set(tournamentId, []);
      }
      grouped.get(tournamentId).push(item);
    }

    return Array.from(grouped.entries()).map(([tournamentId, rows]) => {
      const tournamentName =
        rows[0]?.tournaments?.emertimi ||
        tournaments.find((item) => String(item.id) === tournamentId)?.emertimi ||
        `Tournament #${tournamentId}`;

      const sportName = rows[0]?.tournaments?.sports?.emertimi || null;

      return {
        tournamentId,
        tournamentName,
        sportName,
        rows,
      };
    });
  }, [standings, tournaments, filterTournament, searchQuery]);

  const handleRecalculate = async (turneuId) => {
    try {
      setRecalculatingTournamentId(turneuId);
      await api.post(`/standings/recalculate/${turneuId}`);
      await fetchData();
      setAlert({ type: "success", message: "Standings recalculated successfully." });
    } catch (err) {
      setAlert({
        type: "error",
        message: err.response?.data?.error || err.message || "Failed to recalculate standings.",
      });
    } finally {
      setRecalculatingTournamentId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-gray-600">Checking access...</p>
      </div>
    );
  }

  if (!user || !user.is_admin) {
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
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {alert && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}

      <div className="mx-auto w-full">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-3xl font-bold text-gray-800">Standings</h2>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={filterTournament}
              onChange={(e) => setFilterTournament(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-blue-500"
            >
              <option value="">All tournaments</option>
              {tournaments.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.emertimi}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team..."
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {groupedStandings.length === 0 ? (
          <div className="rounded-lg bg-white p-6 text-center text-gray-600 shadow-sm">
            No standings found for the selected filters.
          </div>
        ) : (
          <div className="space-y-6">
            {groupedStandings.map((group) => (
              <section key={group.tournamentId} className="rounded-lg bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{group.tournamentName}</h3>
                    {group.sportName ? (
                      <p className="text-sm text-gray-500">Sport: {group.sportName}</p>
                    ) : null}
                  </div>
                  <button
                    onClick={() => handleRecalculate(group.tournamentId)}
                    disabled={String(recalculatingTournamentId) === String(group.tournamentId)}
                    className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    {String(recalculatingTournamentId) === String(group.tournamentId)
                      ? "Recalculating..."
                      : "Recalculate"}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left">
                    <thead className="bg-gray-800 text-white">
                      <tr>
                        <th className="px-4 py-3 text-center">#</th>
                        <th className="px-4 py-3">Team</th>
                        <th className="px-4 py-3 text-center">MP</th>
                        <th className="px-4 py-3 text-center">W</th>
                        <th className="px-4 py-3 text-center">D</th>
                        <th className="px-4 py-3 text-center">L</th>
                        <th className="px-4 py-3 text-center">GF</th>
                        <th className="px-4 py-3 text-center">GA</th>
                        <th className="px-4 py-3 text-center">GD</th>
                        <th className="px-4 py-3 text-center">Pts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {group.rows.map((standing, index) => {
                        const gd = Number(standing.golat_shenuar) - Number(standing.golat_pranuar);
                        const gdDisplay = gd > 0 ? `+${gd}` : String(gd);

                        return (
                          <tr key={standing.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-center font-medium text-gray-700">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-800">
                              {standing.teams?.emertimi || "Unknown team"}
                            </td>
                            <td className="px-4 py-3 text-center">{standing.ndeshjet_luajtura}</td>
                            <td className="px-4 py-3 text-center">{standing.fitoret}</td>
                            <td className="px-4 py-3 text-center">{standing.barazimet}</td>
                            <td className="px-4 py-3 text-center">{standing.humbjet}</td>
                            <td className="px-4 py-3 text-center">{standing.golat_shenuar}</td>
                            <td className="px-4 py-3 text-center">{standing.golat_pranuar}</td>
                            <td className="px-4 py-3 text-center">{gdDisplay}</td>
                            <td className="px-4 py-3 text-center font-bold">{standing.piket}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
