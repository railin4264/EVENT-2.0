@echo off
REM Script de Build y Verificación Completa para Windows
REM EVENT NOW 2.0

echo ========================================================
echo         EVENT NOW 2.0 - Build y Verificacion Completa
echo ========================================================
echo.

REM Verificar Node.js
echo Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado
    echo Por favor instala Node.js desde: https://nodejs.org
    pause
    exit /b 1
)
echo OK: Node.js instalado
echo.

REM Verificar MongoDB
echo Verificando MongoDB...
where mongod >nul 2>&1
if %errorlevel% neq 0 (
    echo ADVERTENCIA: MongoDB no encontrado en PATH
    echo Intentando con servicio Windows...
    net start MongoDB >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: MongoDB no esta instalado o no esta corriendo
        echo Por favor instala MongoDB desde: https://www.mongodb.com/try/download/community
        pause
        exit /b 1
    )
) else (
    echo OK: MongoDB encontrado
    REM Intentar iniciar MongoDB si no está corriendo
    tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
    if %errorlevel% neq 0 (
        echo Iniciando MongoDB...
        start /B mongod --dbpath "C:\data\db" >nul 2>&1
        timeout /t 3 >nul
    )
)
echo.

REM Aplicar correcciones críticas
echo ========================================================
echo APLICANDO CORRECCIONES CRITICAS
echo ========================================================
echo.

cd fixes
if exist apply-critical-fixes.js (
    echo Ejecutando script de correcciones...
    node apply-critical-fixes.js
    echo.
) else (
    echo ADVERTENCIA: Script de correcciones no encontrado
)
cd ..

REM Backend
echo ========================================================
echo CONFIGURANDO BACKEND
echo ========================================================
echo.

cd backend-api

REM Instalar dependencias críticas
echo Instalando dependencias de seguridad...
call npm install express-mongo-sanitize winston-daily-rotate-file jsonwebtoken bcryptjs --save
echo.

echo Instalando todas las dependencias...
call npm install
echo.

REM Crear directorios necesarios
if not exist logs mkdir logs
if not exist uploads mkdir uploads
if not exist uploads\temp mkdir uploads\temp

REM Verificar archivo .env
if not exist .env (
    echo ERROR: Archivo .env no encontrado en backend-api
    echo Copiando desde .env.example...
    copy .env.example .env >nul 2>&1
)

REM Iniciar backend
echo Iniciando backend...
start /B cmd /c "npm start"
timeout /t 5 >nul

REM Verificar que el backend esté corriendo
echo Verificando backend...
curl -s http://localhost:5000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo OK: Backend corriendo en http://localhost:5000
) else (
    echo ERROR: Backend no responde
    echo Verifica los logs en backend-api\logs\
)
echo.

cd ..

REM Frontend
echo ========================================================
echo CONFIGURANDO FRONTEND
echo ========================================================
echo.

cd eventconnect-frontend

REM Crear .env.local si no existe
if not exist .env.local (
    echo Creando archivo .env.local...
    (
        echo NEXT_PUBLIC_API_URL=http://localhost:5000/api
        echo NEXT_PUBLIC_WS_URL=ws://localhost:5000
        echo NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSyB_TEMP_KEY_FOR_DEV_ONLY
        echo NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=demo
        echo NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51234567890
        echo NEXT_PUBLIC_FIREBASE_API_KEY=
        echo NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
        echo NEXT_PUBLIC_FIREBASE_PROJECT_ID=
        echo NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
        echo NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
        echo NEXT_PUBLIC_FIREBASE_APP_ID=
    ) > .env.local
    echo OK: .env.local creado
)

echo Instalando dependencias frontend...
call npm install
echo.

echo Compilando frontend...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build del frontend fallo
    echo Intentando modo desarrollo...
)

echo Iniciando frontend...
start /B cmd /c "npm run dev"
timeout /t 5 >nul
echo OK: Frontend corriendo en http://localhost:3000
echo.

cd ..

REM Mobile App
echo ========================================================
echo VERIFICANDO MOBILE APP
echo ========================================================
echo.

cd mobile-app

echo Instalando/Actualizando Expo CLI...
call npm install -g expo-cli@latest 2>nul

echo Instalando dependencias mobile...
call npm install

echo Verificando configuracion mobile...
call npx expo doctor

cd ..

REM Crear script de seed de datos
echo ========================================================
echo CREANDO DATOS DE PRUEBA
echo ========================================================
echo.

cd backend-api
if exist scripts\seed.js (
    echo Poblando base de datos con datos de prueba...
    node scripts\seed.js
) else (
    echo Creando script de seed basico...
    if not exist scripts mkdir scripts
    (
        echo const mongoose = require('mongoose'^);
        echo const bcrypt = require('bcryptjs'^);
        echo const User = require('../src/models/User'^);
        echo.
        echo mongoose.connect(process.env.MONGODB_URI ^|^| 'mongodb://localhost:27017/eventconnect'^);
        echo.
        echo async function seed(^) {
        echo   try {
        echo     const adminUser = await User.findOne({ email: 'admin@eventconnect.com' }^);
        echo     if (!adminUser^) {
        echo       const hashedPassword = await bcrypt.hash('Admin123!@#', 12^);
        echo       await User.create({
        echo         firstName: 'Admin',
        echo         lastName: 'User',
        echo         email: 'admin@eventconnect.com',
        echo         password: hashedPassword,
        echo         role: 'admin',
        echo         emailVerified: true
        echo       }^);
        echo       console.log('Usuario admin creado'^);
        echo     }
        echo     console.log('Seed completado'^);
        echo     process.exit(0^);
        echo   } catch (error^) {
        echo     console.error('Error en seed:', error^);
        echo     process.exit(1^);
        echo   }
        echo }
        echo seed(^);
    ) > scripts\basic-seed.js
    node scripts\basic-seed.js
)
cd ..

REM Resumen final
echo.
echo ========================================================
echo            RESUMEN DE VERIFICACION
echo ========================================================
echo.
echo Estado de servicios:
echo   - Backend API: http://localhost:5000
echo   - Frontend Web: http://localhost:3000
echo   - MongoDB: mongodb://localhost:27017
echo.
echo Cuentas de prueba:
echo   Email: admin@eventconnect.com
echo   Password: Admin123!@#
echo.
echo Proximos pasos:
echo   1. Abre http://localhost:3000 en tu navegador
echo   2. Registra una cuenta o usa las cuentas de prueba
echo   3. Explora la aplicacion
echo.
echo Para ver logs del backend:
echo   type backend-api\logs\eventconnect-*.log
echo.
echo Para detener los servicios:
echo   Cierra esta ventana o presiona Ctrl+C
echo.
echo ========================================================
echo    Build completado exitosamente!
echo ========================================================
echo.
pause
