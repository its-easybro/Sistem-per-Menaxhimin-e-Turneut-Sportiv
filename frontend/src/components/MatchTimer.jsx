import { Clock } from "lucide-react";
import { useMatchTimer } from "../hooks/useMatchTimer";

export default function MatchTimer({ match }) {
  const { display, isFinished } = useMatchTimer(match);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
        match?.statusi === "Live"
          ? isFinished
            ? "bg-red-100 text-red-700"
            : "bg-emerald-100 text-emerald-700"
          : "bg-gray-100 text-gray-600"
      }`}
    >
      <Clock size={14} />
      {isFinished ? "Koha mbaroi" : display}
    </span>
  );
}
