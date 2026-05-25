export default function TableSkeleton() {
  return (
    <div
      className="w-full rounded-lg bg-white p-6 shadow-sm animate-pulse dark:bg-slate-900"
      style={{
        // Keep the fallback visible while the lazy page chunk loads.
        animation: "pulse 2s infinite",
      }}
    >
      <div className="min-h-screen bg-gray-50 p-4 dark:bg-slate-900">
        <div className="w-full mx-auto animate-pulse">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <div className="h-8 rounded w-64 bg-gray-300 dark:bg-slate-700"></div>
              <div className="h-10 rounded w-32 bg-gray-300 dark:bg-slate-700"></div>
            </div>
            <div className="relative">
              <div className="h-12 rounded-lg w-full bg-gray-300 dark:bg-slate-700"></div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow-md dark:bg-slate-900 dark:border dark:border-slate-800">
            <table className="w-full">
              <thead className="bg-gray-800 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-4"><div className="h-4 w-8 rounded bg-gray-600 dark:bg-slate-600"></div></th>
                  <th className="px-6 py-4"><div className="h-4 w-32 rounded bg-gray-600 dark:bg-slate-600"></div></th>
                  <th className="px-6 py-4"><div className="h-4 w-24 rounded bg-gray-600 dark:bg-slate-600"></div></th>
                  <th className="px-6 py-4"><div className="h-4 w-32 rounded bg-gray-600 dark:bg-slate-600"></div></th>
                  <th className="px-6 py-4"><div className="h-4 w-12 rounded bg-gray-600 dark:bg-slate-600"></div></th>
                  <th className="px-6 py-4"><div className="h-4 w-32 rounded bg-gray-600 dark:bg-slate-600"></div></th>
                  <th className="px-6 py-4"><div className="mx-auto h-4 w-20 rounded bg-gray-600 dark:bg-slate-600"></div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                {[...Array(5)].map((_, index) => (
                  <tr key={index} className="bg-white dark:bg-slate-900">
                    <td className="px-6 py-4"><div className="h-4 w-10 rounded bg-gray-200 dark:bg-slate-700"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-40 rounded bg-gray-200 dark:bg-slate-700"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 rounded bg-gray-200 dark:bg-slate-700"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-32 rounded bg-gray-200 dark:bg-slate-700"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-8 rounded bg-gray-200 dark:bg-slate-700"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-32 rounded bg-gray-200 dark:bg-slate-700"></div></td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <div className="h-8 w-16 rounded bg-gray-200 dark:bg-slate-700"></div>
                        <div className="h-8 w-16 rounded bg-gray-200 dark:bg-slate-700"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-slate-700"></div>
    </div>
  );
}
