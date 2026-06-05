// Displays a full-page loading placeholder animation.
export default function PageLoader() {
  return (
    <div
      // Combines Tailwind's pulse animation with a delayed fade-in effect for a smooth loading experience.
      className="w-full rounded-lg bg-white p-6 shadow-sm animate-pulse dark:bg-slate-900"
      style={{
        animation: "pulse 2s infinite, fadeIn 0.15s ease-in forwards 250ms",
        opacity: 0,
      }}
    >
      <div className="w-full space-y-4 p-6 animate-pulse">
        <div className="h-8 w-1/3 rounded bg-gray-200 dark:bg-slate-700"></div>
        <div className="h-4 w-full rounded bg-gray-200 dark:bg-slate-700"></div>
        <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-slate-700"></div>
        <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-slate-700"></div>
      </div>
      <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-slate-700"></div>
    </div>
  );
}
