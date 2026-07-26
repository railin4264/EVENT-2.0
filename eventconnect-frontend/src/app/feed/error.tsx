'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error('ErrorBoundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white/80 dark:bg-zinc-900/60 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 p-8 text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent pointer-events-none" />
        
        <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6 relative z-10">
          <AlertTriangle className="w-10 h-10" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 relative z-10">
          Algo no salió como esperábamos
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-8 relative z-10 text-sm">
          Tuvimos un problema cargando esta sección. Verifica tu conexión a internet o intenta recargar.
        </p>

        <div className="flex flex-col gap-3 relative z-10">
          <button
            onClick={() => reset()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white rounded-xl font-medium transition-all shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
          
          <Link
            href="/events"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium transition-all"
          >
            <Home className="w-4 h-4" />
            Ir al Inicio
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
