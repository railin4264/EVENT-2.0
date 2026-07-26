export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 animate-pulse">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Avatar y header */}
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-24 h-24 bg-gray-800 rounded-full" />
          <div className="h-6 bg-gray-800 rounded-lg w-48" />
          <div className="h-4 bg-gray-800 rounded w-64" />
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-800 rounded-xl" />
          ))}
        </div>
        {/* Contenido */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-800 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
