export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 animate-pulse">
      <div className="h-96 bg-gray-800 w-full" />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="h-10 bg-gray-800 rounded-lg w-3/4" />
        <div className="h-4 bg-gray-800 rounded w-1/2" />
        <div className="h-32 bg-gray-800 rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 bg-gray-800 rounded-xl" />
          <div className="h-20 bg-gray-800 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
