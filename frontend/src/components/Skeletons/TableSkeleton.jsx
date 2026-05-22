export default function TableSkeleton() {
  return (
    <div
      className="w-full rounded-lg bg-white p-6 shadow-sm animate-pulse"
      style={{
        // Keep the fallback visible while the lazy page chunk loads.
        animation: "pulse 2s infinite",
      }}
    >
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="w-full mx-auto animate-pulse">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <div className="h-8 bg-gray-300 rounded w-64"></div>
              <div className="h-10 bg-gray-300 rounded w-32"></div>
            </div>
            <div className="relative">
              <div className="h-12 bg-gray-300 rounded-lg w-full"></div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-600 rounded w-8"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-600 rounded w-32"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-600 rounded w-24"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-600 rounded w-32"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-600 rounded w-12"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-600 rounded w-32"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-600 rounded w-20 mx-auto"></div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...Array(5)].map((_, index) => (
                  <tr key={index} className="bg-white">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-10"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-40"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-8"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
    </div>
  );
}
