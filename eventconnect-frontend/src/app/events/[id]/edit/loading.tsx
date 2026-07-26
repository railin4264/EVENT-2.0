export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 animate-pulse">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="h-10 bg-gray-800 rounded-xl w-48" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-48 bg-gray-800 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
