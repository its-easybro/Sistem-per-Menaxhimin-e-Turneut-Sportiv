import { CalendarDays, CircleDot, Hash, Trophy } from "lucide-react";

const strongText = "text-gray-900 dark:text-slate-100";
const mutedText = "text-gray-500 dark:text-slate-400";

function getTeamLabel(team, fallback) {
  return team?.emertimi || fallback;
}

function formatDate(value) {
  if (!value) return "TBD";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";

  return date.toLocaleDateString("en-GB");
}

function formatTime(value) {
  if (!value) return "";

  const text = String(value);
  if (text.includes("T")) return text.slice(11, 16);

  return text.slice(0, 5);
}

function getMatchStatus(match) {
  if (match.linked_match?.statusi) return match.linked_match.statusi;
  if (match.winner && (!match.home_team || !match.away_team)) return "Bye";
  return "Pending";
}

function TeamRow({ team, fallback, winner }) {
  return (
    <div
      className={`flex min-h-11 items-center justify-between gap-3 rounded-md border px-3 py-2 ${
        winner
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
          : "border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-900"
      }`}
    >
      <span className={`min-w-0 truncate text-sm font-bold ${strongText}`}>
        {getTeamLabel(team, fallback)}
      </span>
      {winner && <Trophy size={15} className="shrink-0 text-emerald-600 dark:text-emerald-300" />}
    </div>
  );
}

function MatchCard({ match }) {
  const homeWins = match.fitues_id && match.fitues_id === match.ekipi_shtepiak_id;
  const awayWins = match.fitues_id && match.fitues_id === match.ekipi_mysafir_id;
  const score = match.score;

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold uppercase text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
          <Hash size={12} />
          {match.position}
        </span>
        <span className={`truncate text-xs font-semibold ${mutedText}`}>
          {getMatchStatus(match)}
        </span>
      </div>

      <div className="space-y-2">
        <TeamRow team={match.home_team} fallback="TBD" winner={homeWins} />
        <TeamRow team={match.away_team} fallback="TBD" winner={awayWins} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-xs dark:border-slate-700">
        <span className={`inline-flex items-center gap-1 ${mutedText}`}>
          <CalendarDays size={13} />
          {formatDate(match.linked_match?.data_ndeshjes || match.data_ndeshjes)}
          {formatTime(match.linked_match?.ora_fillimit || match.ora_fillimit)
            ? `, ${formatTime(match.linked_match?.ora_fillimit || match.ora_fillimit)}`
            : ""}
        </span>
        {score ? (
          <span className={`font-black ${strongText}`}>
            {score.golat_shtepiak}-{score.golat_mysafir}
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1 ${mutedText}`}>
            <CircleDot size={12} />
            No score
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className={mutedText}>
          Match ID: {match.ndeshja_id || "Not created"}
        </span>
        {match.venue && (
          <span className={`truncate font-semibold ${mutedText}`}>
            {match.venue.emertimi}
          </span>
        )}
      </div>
    </article>
  );
}

export default function BracketTree({ rounds = [], champion = null }) {
  if (!rounds.length) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-lg bg-gray-50 text-gray-400 dark:bg-slate-900 dark:text-slate-500">
          <Trophy size={20} />
        </div>
        <p className={`font-bold ${strongText}`}>No bracket generated</p>
        <p className={`mt-1 text-sm ${mutedText}`}>
          Generate a bracket to see rounds and pairings here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {champion && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-xs font-bold uppercase text-amber-700 dark:text-amber-300">
            Champion
          </p>
          <p className={`mt-1 text-xl font-black ${strongText}`}>
            {champion.emertimi}
          </p>
        </div>
      )}

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-full gap-4 md:grid-flow-col md:auto-cols-[minmax(240px,1fr)]">
          {rounds.map((round) => (
            <section
              key={round.round_number}
              className="min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className={`truncate text-base font-black ${strongText}`}>
                  {round.label}
                </h2>
                <span className={`text-xs font-bold ${mutedText}`}>
                  {round.matches.length}
                </span>
              </div>
              <div className="space-y-3">
                {round.matches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
