export default function ChapterLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="h-12 border-b border-gray-100" />
      <div className="max-w-[680px] mx-auto px-6 py-10 animate-pulse">
        <div className="h-6 bg-gray-100 rounded w-2/5 mb-8" />
        <div className="space-y-3">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="h-4 bg-gray-100 rounded"
              style={{ width: `${60 + (i % 4) * 10}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
