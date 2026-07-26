export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 animate-pulse">
      <div className="h-48 bg-gray-800 w-full" />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="h-10 bg-gray-800 rounded-lg w-64" />
        <div className="h-4 bg-gray-800 rounded w-96" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-800 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
