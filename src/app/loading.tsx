export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="h-12 border-b border-gray-100" />
      <div className="max-w-[680px] mx-auto px-6 py-10 animate-pulse">
        <div className="h-6 bg-gray-100 rounded w-1/3 mb-8" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-100 rounded mb-3" style={{ width: `${75 + Math.random() * 25}%` }} />
        ))}
      </div>
    </div>
  )
}
