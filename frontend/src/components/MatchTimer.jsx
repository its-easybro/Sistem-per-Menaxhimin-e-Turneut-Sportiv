import { Clock } from "lucide-react";
import { useMatchTimer } from "../hooks/useMatchTimer";

export default function MatchTimer({ match }) {
  // Get the formatted time and finish state from the timer hook.
  const { display, isFinished } = useMatchTimer(match);

  return (
    <span
      // Change the badge color depending on whether the match is live, finished, or inactive.
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
        match?.statusi === "Live"
          ? isFinished
            ? "bg-red-100 text-red-700"
            : "bg-emerald-100 text-emerald-700"
          : "bg-gray-100 text-gray-600"
      }`}
    >
      <Clock size={14} />
      {/* Show a finished message after the configured match duration is reached. */}
      {isFinished ? "Koha mbaroi" : display}
    </span>
  );
}
