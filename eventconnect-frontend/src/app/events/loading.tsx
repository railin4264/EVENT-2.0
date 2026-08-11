import { DotMatrixLoader } from '@/components/redesign/ui/dot-matrix-loader'

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <DotMatrixLoader variant="wave" size={140} dotColor="#8B5CF6" />
      <p className="text-sm text-muted-foreground animate-pulse">Cargando eventos…</p>
    </div>
  )
}
