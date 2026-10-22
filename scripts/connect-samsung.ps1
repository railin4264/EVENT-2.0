# Script de Conexión Automática para Samsung / Android (EventNow 2.0)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "CONECTOR AUTOMATICO EVENTNOW 2.0 PARA DISPOSITIVOS SAMSUNG" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verificar dispositivos ADB
$devices = adb devices | Select-String -Pattern "\b(device)\b"

if ($devices) {
    Write-Host "Dispositivo Android detectado por USB:" -ForegroundColor Green
    adb devices
    
    # 2. Configurar túneles de puertos inversos (USB sin depender de Wi-Fi)
    Write-Host "`nConfigurando tuneles de puertos inversos por cable USB..." -ForegroundColor Yellow
    adb reverse tcp:8081 tcp:8081  # Metro Bundler
    adb reverse tcp:5000 tcp:5000  # Backend API
    adb reverse tcp:3001 tcp:3001  # Frontend Web
    Write-Host "Puertos 8081 (Metro), 5000 (API) y 3001 (Web) enlazados directamente a tu Samsung." -ForegroundColor Green

    # 3. Lanzar Expo Go si está instalado
    Write-Host "`nAbriendo EventNow 2.0 en tu Samsung..." -ForegroundColor Cyan
    adb shell am start -a android.intent.action.VIEW -d "exp://192.168.100.96:8081"
} else {
    Write-Host "`nNo se detecto ningun dispositivo por USB con ADB." -ForegroundColor Yellow
    Write-Host "OPCION 1: Por cable USB (ADB):" -ForegroundColor White
    Write-Host "  1. Conecta el Samsung a la PC con cable USB." -ForegroundColor Gray
    Write-Host "  2. En el telefono ve a: Ajustes -> Opciones de desarrollador -> Activa 'Depuracion por USB'." -ForegroundColor Gray
    Write-Host "  3. Acepta en la pantalla: 'Permitir depuracion por USB desde esta computadora'." -ForegroundColor Gray
    Write-Host "`nOPCION 2: Por Wi-Fi con Expo Go (Recomendado):" -ForegroundColor White
    Write-Host "  1. Abre la app 'Expo Go' en tu Samsung." -ForegroundColor Gray
    Write-Host "  2. Asegurate de estar conectado a la misma red Wi-Fi." -ForegroundColor Gray
    Write-Host "  3. Abre esta URL o escribe: exp://192.168.100.96:8081" -ForegroundColor Green
}
Write-Host "`nServidor Metro activo en: http://192.168.100.96:8081" -ForegroundColor Cyan
Write-Host "Backend API activo en:   http://192.168.100.96:5000" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
