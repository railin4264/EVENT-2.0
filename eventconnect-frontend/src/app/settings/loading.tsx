export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-3 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-800 rounded-xl" />
            ))}
          </div>
          <div className="lg:col-span-9 space-y-4">
            <div className="h-8 bg-gray-800 rounded-lg w-48" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-800 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
