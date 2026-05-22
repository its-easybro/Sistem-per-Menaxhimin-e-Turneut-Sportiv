export default function PageLoader() {
  return (
    <div
      className="w-full rounded-lg bg-white p-6 shadow-sm animate-pulse"
      style={{
        animation: "pulse 2s infinite, fadeIn 0.15s ease-in forwards 250ms",
        opacity: 0,
      }}
    >
      <div className="w-full space-y-4 p-6 animate-pulse">
        <div className="h-8 w-1/3 rounded bg-gray-200"></div>
        <div className="h-4 w-full rounded bg-gray-200"></div>
        <div className="h-4 w-5/6 rounded bg-gray-200"></div>
        <div className="h-4 w-2/3 rounded bg-gray-200"></div>
      </div>
      <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
    </div>
  );
}
