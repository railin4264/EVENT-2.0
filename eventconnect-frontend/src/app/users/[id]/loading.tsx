export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 animate-pulse">
      <div className="h-48 bg-gray-800 w-full" />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 bg-gray-800 rounded-full -mt-16" />
          <div className="space-y-2 flex-1">
            <div className="h-6 bg-gray-800 rounded w-48" />
            <div className="h-4 bg-gray-800 rounded w-32" />
          </div>
        </div>
        <div className="h-20 bg-gray-800 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-800 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
