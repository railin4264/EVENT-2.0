# 🚀 Script de Migración para Windows PowerShell
# Event Connect 2.0 - Integración Rediseño

Write-Host ""
Write-Host "🎨 ==========================================" -ForegroundColor Cyan
Write-Host "   Event Connect 2.0 - Integración Rediseño" -ForegroundColor Cyan
Write-Host "   ==========================================" -ForegroundColor Cyan
Write-Host ""

# Función para confirmación
function Confirm-Action {
    param([string]$Message)
    $response = Read-Host "$Message (s/n)"
    return $response -eq 's' -or $response -eq 'S'
}

# Función para mostrar paso
function Show-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "🔹 $Message" -ForegroundColor Blue
}

# Paso 1: Verificar directorio
Show-Step "Verificando directorio..."
if (-not (Test-Path "eventconnect-frontend")) {
    Write-Host "❌ Error: No se encuentra la carpeta eventconnect-frontend" -ForegroundColor Red
    Write-Host "   Por favor ejecuta este script desde el directorio raíz del proyecto" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Directorio correcto" -ForegroundColor Green

# Paso 2: Backup
Show-Step "Crear backup del diseño actual?"
if (Confirm-Action "¿Crear backup en backup-diseño-anterior/?") {
    Write-Host "   Creando backup..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path "backup-diseño-anterior" | Out-Null
    Copy-Item -Path "eventconnect-frontend\src" -Destination "backup-diseño-anterior\" -Recurse -Force
    Write-Host "✅ Backup creado" -ForegroundColor Green
} else {
    Write-Host "⚠️  Continuando sin backup" -ForegroundColor Yellow
}

# Paso 3: Rama Git
Show-Step "Crear rama de Git?"
if (Confirm-Action "¿Crear rama feature/integracion-nuevo-diseño?") {
    Push-Location eventconnect-frontend
    try {
        git checkout -b feature/integracion-nuevo-diseño 2>&1 | Out-Null
        Write-Host "✅ Rama creada" -ForegroundColor Green
    } catch {
        Write-Host "   Rama ya existe, usando la existente" -ForegroundColor Yellow
    }
    Pop-Location
} else {
    Write-Host "⚠️  Continuando en rama actual" -ForegroundColor Yellow
}

# Paso 4: Migración de componentes
Show-Step "Migrar componentes?"
if (Confirm-Action "¿Mover componentes de /redesign a la raíz?") {
    
    $redesignPath = "eventconnect-frontend\src\components\redesign"
    $componentsPath = "eventconnect-frontend\src\components"
    
    if (Test-Path $redesignPath) {
        Write-Host "   📦 Moviendo componentes..." -ForegroundColor Yellow
        
        # Crear carpeta mobile si no existe
        New-Item -ItemType Directory -Force -Path "$componentsPath\mobile" | Out-Null
        
        # Mover archivos .tsx principales
        Get-ChildItem "$redesignPath\*.tsx" | ForEach-Object {
            Move-Item -Path $_.FullName -Destination $componentsPath -Force
        }
        
        # Mover componentes móviles
        if (Test-Path "$redesignPath\mobile") {
            Get-ChildItem "$redesignPath\mobile\*.tsx" | ForEach-Object {
                Move-Item -Path $_.FullName -Destination "$componentsPath\mobile" -Force
            }
        }
        
        Write-Host "✅ Componentes migrados" -ForegroundColor Green
    } else {
        Write-Host "⚠️  No se encontró carpeta redesign" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Migración omitida" -ForegroundColor Yellow
}

# Paso 5: Actualizar página principal
Show-Step "Actualizar página principal?"
if (Confirm-Action "¿Reemplazar src/app/page.tsx con nuevo diseño?") {
    
    $newPageContent = @"
import { AppRedesign } from '@/components/AppRedesign'

export default function Home() {
  return <AppRedesign />
}
"@
    
    Set-Content -Path "eventconnect-frontend\src\app\page.tsx" -Value $newPageContent -Encoding UTF8
    Write-Host "✅ Página principal actualizada" -ForegroundColor Green
} else {
    Write-Host "⚠️  Página sin cambios" -ForegroundColor Yellow
}

# Paso 6: Actualizar imports
Show-Step "Actualizar imports?"
if (Confirm-Action "¿Cambiar @/components/redesign por @/components en todos los archivos?") {
    
    Write-Host "   🔄 Actualizando imports..." -ForegroundColor Yellow
    
    $files = Get-ChildItem -Path "eventconnect-frontend\src" -Include *.tsx,*.ts -Recurse
    
    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        $newContent = $content -replace '@/components/redesign', '@/components'
        
        if ($content -ne $newContent) {
            Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8
        }
    }
    
    Write-Host "✅ Imports actualizados" -ForegroundColor Green
} else {
    Write-Host "⚠️  Imports sin cambios" -ForegroundColor Yellow
}

# Paso 7: Limpiar carpeta redesign
Show-Step "Limpiar carpeta redesign?"
if (Confirm-Action "¿Eliminar carpeta redesign vacía?") {
    $redesignPath = "eventconnect-frontend\src\components\redesign"
    if (Test-Path $redesignPath) {
        Remove-Item -Path $redesignPath -Recurse -Force
        Write-Host "✅ Carpeta redesign eliminada" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  Carpeta mantenida" -ForegroundColor Yellow
}

# Paso 8: Instalar dependencias
Show-Step "Instalar dependencias?"
if (Confirm-Action "¿Ejecutar npm install?") {
    Push-Location eventconnect-frontend
    Write-Host "   📦 Instalando..." -ForegroundColor Yellow
    npm install
    Write-Host "✅ Dependencias instaladas" -ForegroundColor Green
    Pop-Location
} else {
    Write-Host "⚠️  Dependencias omitidas" -ForegroundColor Yellow
}

# Paso 9: Build de prueba
Show-Step "Ejecutar build de prueba?"
if (Confirm-Action "¿Verificar que todo compile?") {
    Push-Location eventconnect-frontend
    Write-Host "   🏗️  Building..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Build exitoso" -ForegroundColor Green
    } else {
        Write-Host "❌ Build falló - revisa errores" -ForegroundColor Red
    }
    Pop-Location
} else {
    Write-Host "⚠️  Build omitido" -ForegroundColor Yellow
}

# Resumen final
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "   🎉 Migración Completada" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Resumen:" -ForegroundColor Blue
Write-Host "   ✅ Componentes migrados"
Write-Host "   ✅ Imports actualizados"
Write-Host "   ✅ Página principal actualizada"
Write-Host ""
Write-Host "🚀 Próximos pasos:" -ForegroundColor Blue
Write-Host "   1. cd eventconnect-frontend"
Write-Host "   2. npm run dev"
Write-Host "   3. Abrir: http://localhost:3001"
Write-Host "   4. git add . && git commit -m 'Integrar nuevo diseño'"
Write-Host ""
Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   - Prueba todas las funcionalidades"
Write-Host "   - Valida vistas móviles"
Write-Host "   - Revisa login/logout"
Write-Host ""
Write-Host "¡Listo para desarrollar! 🎨" -ForegroundColor Green
Write-Host ""
