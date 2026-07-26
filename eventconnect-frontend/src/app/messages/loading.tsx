export default function Loading() {
  return (
    <div className="h-screen bg-gray-950 flex animate-pulse">
      {/* Sidebar skeleton */}
      <div className="w-80 border-r border-gray-800 flex flex-col p-4 space-y-3">
        <div className="h-8 bg-gray-800 rounded-lg w-32" />
        <div className="h-10 bg-gray-800 rounded-xl" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <div className="w-12 h-12 bg-gray-800 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-800 rounded w-28" />
              <div className="h-3 bg-gray-800 rounded w-40" />
            </div>
          </div>
        ))}
      </div>
      {/* Chat area skeleton */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-gray-800 rounded-full mx-auto" />
          <div className="h-6 bg-gray-800 rounded-lg w-48 mx-auto" />
          <div className="h-4 bg-gray-800 rounded w-64 mx-auto" />
        </div>
      </div>
    </div>
  );
}
