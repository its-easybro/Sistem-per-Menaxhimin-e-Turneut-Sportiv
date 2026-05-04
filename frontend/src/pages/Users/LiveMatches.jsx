import { useEffect, useState } from "react";
import api from "../../config/axiosInstance";
import socket from "../../socket";
import MatchTimer from "../../components/MatchTimer";
import { Alert } from "../../components/Alert";

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

function getCardClass(card) {
  if (card === "E kuqe") {
    return "bg-red-100 text-red-700 border-red-200";
  }

  return "bg-yellow-100 text-yellow-800 border-yellow-200";
}

function formatCardMinute(minute, duration) {
  const parsedMinute = Number(minute);
  if (!Number.isFinite(parsedMinute) || parsedMinute < 0) return "-";

  const maxMinute =
    typeof duration === "number" && duration > 0
      ? duration
      : DEFAULT_MATCH_DURATION_MINUTES;

  if (parsedMinute > maxMinute) {
    return `${maxMinute}+`;
  }

  return String(parsedMinute);
}

export default function LiveMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const loadMatches = async () => {
      try {
        setLoading(true);
        const response = await api.get("/matches/public/live");
        setMatches(Array.isArray(response.data) ? response.data : []);
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

    loadMatches();
  }, []);

  useEffect(() => {
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
      setMatches((prev) =>
        prev.map((match) =>
          match.id === matchId
            ? {
                ...match,
                score: {
                  golat_shtepiak: homeScore,
                  golat_mysafir: awayScore,
                },
              }
            : match,
        ),
      );
    };

    const handleCardEvent = (event) => {
      setMatches((prev) =>
        prev.map((match) =>
          match.id === event.matchId
            ? {
                ...match,
                cards: [
                  ...(match.cards || []),
                  {
                    id: event.eventId,
                    matchId: event.matchId,
                    playerId: event.playerId,
                    playerName: event.playerName,
                    teamId: event.teamId,
                    teamName: event.teamName,
                    card: event.card,
                    minuta: event.minuta,
                  },
                ],
              }
            : match,
        ),
      );
    };

    socket.on("match_live", handleMatchLive);
    socket.on("match_finished", handleMatchFinished);
    socket.on("score_update", handleScoreUpdate);
    socket.on("card_event", handleCardEvent);

    return () => {
      socket.off("match_live", handleMatchLive);
      socket.off("match_finished", handleMatchFinished);
      socket.off("score_update", handleScoreUpdate);
      socket.off("card_event", handleCardEvent);
    };
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Live Matches</h1>
          <p className="mt-2 text-gray-600">
            Follow live scores, match status, timers, and card events.
          </p>
        </div>

        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        {loading ? (
          <div className="rounded-lg bg-white p-6 text-gray-600 shadow">
            Loading live matches...
          </div>
        ) : matches.length === 0 ? (
          <div className="rounded-lg bg-white p-6 text-gray-600 shadow">
            No live or recent matches found.
          </div>
        ) : (
          <div className="grid gap-6">
            {matches.map((match) => (
              <section
                key={match.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {match.turneu_emri || "Tournament"} -{" "}
                      {match.faza || "Match"}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatDate(match.data_ndeshjes)} -{" "}
                      {formatTime(match.ora_fillimit)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        match.statusi === "Live"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {match.statusi}
                    </span>
                    <MatchTimer match={match} />
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-y border-gray-100 py-6">
                  <div className="text-right">
                    <h2 className="text-xl font-bold text-gray-900">
                      {match.ekipi_shtepiak || "Home Team"}
                    </h2>
                  </div>

                  <div className="rounded-lg bg-gray-900 px-6 py-3 text-center text-3xl font-bold text-white">
                    {match.score?.golat_shtepiak ?? 0} -{" "}
                    {match.score?.golat_mysafir ?? 0}
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {match.ekipi_mysafir || "Away Team"}
                    </h2>
                  </div>
                </div>

                <div className="mt-5">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Card Timeline
                  </h3>

                  {match.cards?.length ? (
                    <div className="space-y-2">
                      {match.cards.map((card) => (
                        <div
                          key={`${card.id}-${card.minuta}`}
                          className={`flex items-center justify-between rounded-lg border px-4 py-3 ${getCardClass(
                            card.card,
                          )}`}
                        >
                          <span className="font-semibold">
                            {formatCardMinute(card.minuta, match.kohezgjatja)}' -{" "}
                            {card.card}
                          </span>
                          <span>
                            {card.playerName || "Unknown player"}
                            {card.teamName ? ` - ${card.teamName}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No card events yet.
                    </p>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
