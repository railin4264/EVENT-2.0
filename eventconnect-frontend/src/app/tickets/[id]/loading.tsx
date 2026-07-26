export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 animate-pulse">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <div className="h-8 bg-gray-800 rounded-lg w-48" />
        <div className="h-64 bg-gray-800 rounded-xl" />
        <div className="h-48 bg-gray-800 rounded-xl" />
      </div>
    </div>
  );
}
