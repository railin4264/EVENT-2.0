import { DiscoveryLoadingSkeleton } from '@/components/ui/LoadingStates';

export default function Loading() {
  return (
    <div className="min-h-screen py-24 px-4 bg-gray-50/50 dark:bg-zinc-950/50">
      <div className="container mx-auto max-w-7xl">
        <DiscoveryLoadingSkeleton />
      </div>
    </div>
  );
}
