export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        <div className="h-12 bg-gray-800 rounded-xl w-full" />
        <div className="flex gap-3 mt-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-800 rounded-full w-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-800 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
