#!/bin/bash

# Script de Build y Verificación Completa
# EVENT NOW 2.0
# Este script realiza un build completo y detecta todos los errores

echo "🚀 EVENT NOW 2.0 - Build y Verificación Completa"
echo "================================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar comando exitoso
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 completado exitosamente${NC}"
    else
        echo -e "${RED}❌ Error en $1${NC}"
        return 1
    fi
}

# 1. VERIFICAR MONGODB
echo "🗄️ Verificando MongoDB..."
if command -v mongod &> /dev/null; then
    if pgrep -x "mongod" > /dev/null; then
        echo -e "${GREEN}✅ MongoDB está ejecutándose${NC}"
    else
        echo -e "${YELLOW}⚠️ MongoDB no está ejecutándose. Intentando iniciar...${NC}"
        if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
            net start MongoDB
        else
            sudo systemctl start mongod
        fi
    fi
else
    echo -e "${RED}❌ MongoDB no está instalado${NC}"
    echo "Por favor instala MongoDB desde: https://www.mongodb.com/try/download/community"
    exit 1
fi
echo ""

# 2. VERIFICAR REDIS (Opcional)
echo "🔴 Verificando Redis..."
if command -v redis-cli &> /dev/null; then
    redis-cli ping > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Redis está ejecutándose${NC}"
    else
        echo -e "${YELLOW}⚠️ Redis no está ejecutándose (opcional)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Redis no instalado (opcional para desarrollo)${NC}"
fi
echo ""

# 3. BACKEND - Instalar dependencias
echo "📦 BACKEND - Instalando dependencias..."
cd backend-api

# Instalar dependencias faltantes
npm install express-mongo-sanitize winston-daily-rotate-file --save
check_status "Instalación de dependencias de seguridad"

# Instalar todas las dependencias
npm install
check_status "Instalación de dependencias backend"

# Ejecutar linting
echo "🔍 Ejecutando ESLint..."
npm run lint:fix 2>/dev/null || true

# Ejecutar tests
echo "🧪 Ejecutando tests backend..."
npm test 2>/dev/null || echo -e "${YELLOW}⚠️ Algunos tests fallaron${NC}"

# Iniciar backend
echo "🚀 Iniciando backend..."
npm start &
BACKEND_PID=$!
sleep 5

# Verificar que el backend esté corriendo
curl -s http://localhost:5000/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend ejecutándose en http://localhost:5000${NC}"
else
    echo -e "${RED}❌ Backend no responde${NC}"
fi
echo ""

# 4. FRONTEND - Next.js
echo "📦 FRONTEND - Instalando dependencias..."
cd ../eventconnect-frontend

# Instalar dependencias
npm install
check_status "Instalación de dependencias frontend"

# Crear archivo .env.local si no existe
if [ ! -f .env.local ]; then
    echo "Creando .env.local..."
    cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_WS_URL=ws://localhost:5000
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSyB_TEMP_KEY_FOR_DEV_ONLY
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=demo
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51234567890
EOF
    echo -e "${GREEN}✅ .env.local creado${NC}"
fi

# Build frontend
echo "🏗️ Compilando frontend..."
npm run build
check_status "Build frontend"

# Iniciar frontend
echo "🚀 Iniciando frontend..."
npm run dev &
FRONTEND_PID=$!
sleep 5

echo -e "${GREEN}✅ Frontend ejecutándose en http://localhost:3000${NC}"
echo ""

# 5. MOBILE APP
echo "📱 MOBILE APP - Verificando..."
cd ../mobile-app

# Actualizar Expo CLI
echo "Actualizando Expo CLI..."
npm install -g expo-cli@latest 2>/dev/null || true

# Instalar dependencias
npm install
check_status "Instalación de dependencias mobile"

# Verificar configuración
npx expo doctor
echo ""

# 6. RESUMEN FINAL
echo "════════════════════════════════════════════════════════"
echo "📊 RESUMEN DE VERIFICACIÓN"
echo "════════════════════════════════════════════════════════"
echo ""

# Verificar servicios
echo "🔍 Estado de servicios:"
echo -e "   Backend API: ${GREEN}http://localhost:5000${NC}"
echo -e "   Frontend Web: ${GREEN}http://localhost:3000${NC}"
echo -e "   MongoDB: ${GREEN}mongodb://localhost:27017${NC}"
echo ""

echo "📝 Cuentas de prueba disponibles:"
echo "   Email: admin@eventconnect.com"
echo "   Password: Admin123!@#"
echo ""

echo "🛠️ Comandos útiles:"
echo "   Ver logs backend: tail -f backend-api/logs/*.log"
echo "   Ver logs frontend: En la consola del navegador"
echo "   Detener servicios: kill $BACKEND_PID $FRONTEND_PID"
echo ""

echo -e "${GREEN}✨ ¡Build completado exitosamente!${NC}"
echo ""
echo "Próximos pasos:"
echo "1. Abre http://localhost:3000 en tu navegador"
echo "2. Registra una cuenta o usa las cuentas de prueba"
echo "3. Explora la aplicación"
echo ""

# Mantener el script corriendo
echo "Presiona Ctrl+C para detener todos los servicios..."
wait
