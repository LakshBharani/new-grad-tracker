// Skeleton shown while the board fetches data — Next.js streams this
// in immediately so navigation feels instant.
export default function BoardLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded bg-gray-200" />
          <div className="h-4 w-56 rounded bg-gray-100" />
        </div>
        <div className="h-9 w-32 rounded-md bg-indigo-100" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="h-10 flex-1 min-w-[200px] rounded-md bg-gray-100" />
        <div className="h-10 w-36 rounded-md bg-gray-100" />
        <div className="h-10 w-40 rounded-md bg-gray-100" />
        <div className="h-10 w-48 rounded-md bg-gray-100" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-3 w-40 rounded bg-gray-100" />
                </div>
                <div className="h-3 w-72 rounded bg-gray-100" />
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-20 rounded-full bg-gray-100" />
                  <div className="h-5 w-20 rounded-full bg-gray-100" />
                  <div className="h-5 w-20 rounded-full bg-gray-100" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="h-8 w-24 rounded-md bg-indigo-100" />
                <div className="h-7 w-7 rounded bg-gray-100" />
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
