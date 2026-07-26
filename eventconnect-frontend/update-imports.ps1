# Script para actualizar imports de @/components/ui/ a @/components/redesign/ui/

$rootPath = "src"

# Lista de archivos a actualizar (los 23 archivos encontrados)
$files = @(
    "app\layout.tsx",
    "app\forgot-password\page.tsx",
    "app\events\page.tsx",
    "app\discovery\page.tsx",
    "app\dashboard\page.tsx",
    "app\admin\analytics\page.tsx",
    "app\login\page.tsx",
    "app\notifications\page.tsx",
    "app\register\page.tsx",
    "app\users\[id]\page.tsx",
    "app\social\page.tsx",
    "components\ui\Toaster.tsx",
    "components\ui\NotificationCenter.tsx",
    "components\layout\Navbar.tsx",
    "components\analytics\LazyAnalyticsDashboard.tsx",
    "components\analytics\AnalyticsDashboard.tsx",
    "components\layout\ClientLayout.tsx",
    "components\discovery\MapComponent.tsx",
    "components\discovery\LazyMapComponent.tsx",
    "components\social\UserSuggestions.tsx",
    "components\social\FollowsList.tsx",
    "components\social\FollowRequests.tsx",
    "components\social\FollowButton.tsx"
)

$updateCount = 0

foreach ($file in $files) {
    $filePath = Join-Path $rootPath $file

    if (Test-Path $filePath) {
        Write-Host "Actualizando: $file" -ForegroundColor Yellow

        $content = Get-Content $filePath -Raw
        $originalContent = $content

        # Reemplazar imports
        $content = $content -replace "@/components/ui/", "@/components/redesign/ui/"

        if ($content -ne $originalContent) {
            Set-Content $filePath $content -NoNewline
            $updateCount++
            Write-Host "  ✓ Actualizado" -ForegroundColor Green
        } else {
            Write-Host "  - Sin cambios" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ✗ No encontrado: $filePath" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Archivos actualizados: $updateCount" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
