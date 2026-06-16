// Skeleton shown while My Tracker fetches data — Next.js streams this
// in immediately so navigation feels instant.
export default function MyAppsLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-40 rounded bg-gray-200" />
        <div className="h-4 w-56 rounded bg-gray-100" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="h-10 flex-1 min-w-[200px] rounded-md bg-gray-100" />
        <div className="h-10 w-40 rounded-md bg-gray-100" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-28 rounded bg-gray-200" />
                  <div className="h-3 w-44 rounded bg-gray-100" />
                  <div className="h-5 w-20 rounded-full bg-gray-100" />
                </div>
                <div className="h-3 w-64 rounded bg-gray-100" />
                <div className="h-3 w-80 rounded bg-gray-50" />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="h-8 w-36 rounded-md bg-gray-100" />
                <div className="h-7 w-7 rounded bg-gray-100" />
                <div className="h-7 w-7 rounded bg-gray-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
