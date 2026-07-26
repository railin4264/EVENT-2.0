export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 animate-pulse pb-24 pt-6">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        <div className="h-10 bg-gray-800 rounded-lg w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 bg-gray-800 rounded-3xl" />
            <div className="h-64 bg-gray-800 rounded-3xl" />
            <div className="h-64 bg-gray-800 rounded-3xl" />
          </div>
          <div className="h-80 bg-gray-800 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
