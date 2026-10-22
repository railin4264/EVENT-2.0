'use client';
import { useEffect } from 'react';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Algo salió mal</h2>
        <p className="text-gray-400">{error.message || 'Error al cargar moderación'}</p>
        <button onClick={reset} className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
