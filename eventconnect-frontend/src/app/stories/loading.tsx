export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        <div className="h-8 bg-gray-800 rounded-lg w-64" />
        <div className="flex gap-4 overflow-hidden mt-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-24 h-40 bg-gray-800 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-800 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
