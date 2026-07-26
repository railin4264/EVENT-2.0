export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 animate-pulse flex items-center justify-center">
      <div className="w-full max-w-sm space-y-4 px-4">
        <div className="h-8 bg-gray-800 rounded-lg w-40 mx-auto" />
        <div className="aspect-[9/16] bg-gray-800 rounded-2xl" />
        <div className="h-12 bg-gray-800 rounded-xl" />
      </div>
    </div>
  );
}
