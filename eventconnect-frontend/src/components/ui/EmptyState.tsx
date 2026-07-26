import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  className
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-3xl",
        "bg-white/5 dark:bg-black/20 backdrop-blur-md border border-white/10 dark:border-white/5",
        "shadow-[0_8px_32px_rgba(0,0,0,0.05)]",
        className
      )}
    >
      <div className="w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-primary-500/20 to-secondary-500/20 flex items-center justify-center relative group">
        <div className="absolute inset-0 rounded-full bg-primary-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <Icon className="w-10 h-10 text-primary-500/80 drop-shadow-md" strokeWidth={1.5} />
      </div>
      
      <h3 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 mb-3">
        {title}
      </h3>
      
      <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8 text-sm md:text-base leading-relaxed">
        {description}
      </p>

      {(actionLabel && (actionHref || actionOnClick)) && (
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          {actionHref ? (
            <Link 
              href={actionHref}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-500/30"
            >
              {actionLabel}
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <button 
              onClick={actionOnClick}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-500/30"
            >
              {actionLabel}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
