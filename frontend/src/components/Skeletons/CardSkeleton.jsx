export default function CardSkeleton() {
  return (
    <div
      className="w-full rounded-lg bg-white p-6 shadow-sm animate-pulse"
      style={{
        // Combines Tailwind's pulse with a delayed fade-in
        animation: "pulse 2s infinite, fadeIn 0.15s ease-in forwards 250ms",
        opacity: 0,
      }}
    >
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm animate-pulse">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="h-4 w-48 rounded bg-gray-200"></div>
            <div className="mt-2 h-4 w-32 rounded bg-gray-200"></div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-7 w-16 rounded-full bg-gray-200"></div>
            <div className="h-7 w-20 rounded bg-gray-200"></div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-y border-gray-100 py-6">
          <div className="flex justify-end">
            <div className="h-7 w-36 rounded bg-gray-200"></div>
          </div>
          <div className="h-14 w-28 rounded-lg bg-gray-200"></div>
          <div className="flex justify-start">
            <div className="h-7 w-36 rounded bg-gray-200"></div>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-3 h-4 w-28 rounded bg-gray-200"></div>
          <div className="space-y-2">
            <div className="h-11 w-full rounded-lg bg-gray-100"></div>
          </div>
        </div>
      </div>
      <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
    </div>
  );
}
