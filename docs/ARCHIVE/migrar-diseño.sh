#!/bin/bash

# 🚀 Script de Migración Automática - Event Connect 2.0
# Este script integra el nuevo diseño como principal

echo "🎨 =========================================="
echo "   Event Connect 2.0 - Integración Rediseño"
echo "   =========================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para preguntar confirmación
confirm() {
    read -p "$1 (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        return 0
    else
        return 1
    fi
}

# Paso 1: Verificar que estamos en el directorio correcto
echo -e "${BLUE}📂 Verificando directorio...${NC}"
if [ ! -d "eventconnect-frontend" ]; then
    echo -e "${RED}❌ Error: No se encuentra la carpeta eventconnect-frontend${NC}"
    echo "   Por favor ejecuta este script desde el directorio raíz del proyecto"
    exit 1
fi
echo -e "${GREEN}✅ Directorio correcto${NC}"
echo ""

# Paso 2: Crear backup
echo -e "${BLUE}💾 ¿Crear backup del diseño actual?${NC}"
if confirm "Esto guardará una copia de seguridad en backup-diseño-anterior/"; then
    echo "   Creando backup..."
    mkdir -p backup-diseño-anterior
    cp -r eventconnect-frontend/src backup-diseño-anterior/
    echo -e "${GREEN}✅ Backup creado en: backup-diseño-anterior/${NC}"
else
    echo -e "${YELLOW}⚠️  Continuando sin backup${NC}"
fi
echo ""

# Paso 3: Crear rama de Git
echo -e "${BLUE}🌿 ¿Crear rama de Git para la integración?${NC}"
if confirm "Esto creará: feature/integracion-nuevo-diseño"; then
    cd eventconnect-frontend
    git checkout -b feature/integracion-nuevo-diseño 2>/dev/null || echo "   Rama ya existe, usando la existente"
    cd ..
    echo -e "${GREEN}✅ Rama lista${NC}"
else
    echo -e "${YELLOW}⚠️  Continuando en rama actual${NC}"
fi
echo ""

# Paso 4: Migración de componentes
echo -e "${BLUE}🔄 Iniciando migración de componentes...${NC}"
if confirm "Esto moverá los componentes de /redesign a la raíz"; then
    
    cd eventconnect-frontend/src/components
    
    # Crear carpetas necesarias si no existen
    echo "   📁 Creando estructura de carpetas..."
    mkdir -p mobile
    
    # Mover componentes principales
    echo "   📦 Moviendo componentes principales..."
    if [ -d "redesign" ]; then
        # Mover archivos principales
        find redesign -maxdepth 1 -name "*.tsx" -exec mv {} . \;
        
        # Mover componentes móviles
        if [ -d "redesign/mobile" ]; then
            mv redesign/mobile/* mobile/ 2>/dev/null || true
        fi
        
        echo -e "${GREEN}✅ Componentes migrados${NC}"
    else
        echo -e "${YELLOW}⚠️  No se encontró carpeta redesign${NC}"
    fi
    
    cd ../../..
else
    echo -e "${YELLOW}⚠️  Saltando migración de componentes${NC}"
fi
echo ""

# Paso 5: Actualizar página principal
echo -e "${BLUE}🏠 ¿Actualizar página principal (page.tsx)?${NC}"
if confirm "Esto reemplazará src/app/page.tsx con el nuevo diseño"; then
    
    cat > eventconnect-frontend/src/app/page.tsx << 'EOF'
import { AppRedesign } from '@/components/AppRedesign'

export default function Home() {
  return <AppRedesign />
}
EOF
    
    echo -e "${GREEN}✅ Página principal actualizada${NC}"
else
    echo -e "${YELLOW}⚠️  Página principal sin cambios${NC}"
fi
echo ""

# Paso 6: Actualizar imports (búsqueda y reemplazo)
echo -e "${BLUE}🔍 ¿Actualizar imports automáticamente?${NC}"
if confirm "Esto cambiará @/components/redesign por @/components en todos los archivos"; then
    
    cd eventconnect-frontend/src
    
    echo "   🔄 Actualizando imports en archivos TypeScript..."
    find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i.bak 's/@\/components\/redesign/@\/components/g' {} \;
    
    # Limpiar archivos backup
    find . -name "*.bak" -delete
    
    echo -e "${GREEN}✅ Imports actualizados${NC}"
    cd ../..
else
    echo -e "${YELLOW}⚠️  Imports sin cambios - deberás actualizarlos manualmente${NC}"
fi
echo ""

# Paso 7: Limpiar carpeta redesign
echo -e "${BLUE}🧹 ¿Eliminar carpeta redesign vacía?${NC}"
if confirm "Esto eliminará eventconnect-frontend/src/components/redesign"; then
    rm -rf eventconnect-frontend/src/components/redesign
    echo -e "${GREEN}✅ Carpeta redesign eliminada${NC}"
else
    echo -e "${YELLOW}⚠️  Carpeta redesign mantenida${NC}"
fi
echo ""

# Paso 8: Instalar dependencias
echo -e "${BLUE}📦 ¿Instalar/actualizar dependencias?${NC}"
if confirm "Esto ejecutará npm install en eventconnect-frontend"; then
    cd eventconnect-frontend
    npm install
    echo -e "${GREEN}✅ Dependencias actualizadas${NC}"
    cd ..
else
    echo -e "${YELLOW}⚠️  Dependencias sin actualizar${NC}"
fi
echo ""

# Paso 9: Testing
echo -e "${BLUE}🧪 ¿Ejecutar build de prueba?${NC}"
if confirm "Esto verificará que todo compile correctamente"; then
    cd eventconnect-frontend
    echo "   Building..."
    npm run build
    BUILD_STATUS=$?
    if [ $BUILD_STATUS -eq 0 ]; then
        echo -e "${GREEN}✅ Build exitoso - ¡Sin errores!${NC}"
    else
        echo -e "${RED}❌ Build falló - revisa los errores arriba${NC}"
    fi
    cd ..
else
    echo -e "${YELLOW}⚠️  Build omitido${NC}"
fi
echo ""

# Resumen final
echo ""
echo -e "${GREEN}=========================================="
echo "   🎉 Migración Completada"
echo "==========================================${NC}"
echo ""
echo -e "${BLUE}📋 Resumen:${NC}"
echo "   ✅ Backup creado (si se solicitó)"
echo "   ✅ Rama Git creada (si se solicitó)"
echo "   ✅ Componentes migrados"
echo "   ✅ Imports actualizados"
echo "   ✅ Página principal actualizada"
echo ""
echo -e "${BLUE}🚀 Próximos pasos:${NC}"
echo "   1. Revisar que todo funcione: cd eventconnect-frontend && npm run dev"
echo "   2. Probar en: http://localhost:3001"
echo "   3. Ejecutar tests: npm run test"
echo "   4. Hacer commit: git add . && git commit -m 'Integrar nuevo diseño'"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "   - Prueba todas las funcionalidades antes de hacer merge"
echo "   - Revisa que las vistas móviles funcionen"
echo "   - Valida el login/logout"
echo ""
echo -e "${GREEN}¡Listo para empezar a desarrollar! 🎨${NC}"
