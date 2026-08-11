import { DotMatrixLoader } from '@/components/redesign/ui/dot-matrix-loader'

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <DotMatrixLoader variant="radar" size={150} dotColor="#22D3EE" />
      <p className="text-sm text-muted-foreground animate-pulse">Cargando…</p>
    </div>
  )
}
