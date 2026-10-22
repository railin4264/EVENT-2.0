#!/bin/bash

# ============================================
# EventConnect 2.0 - Script de Deployment
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   EventConnect 2.0 - Deployment Script${NC}"
echo -e "${BLUE}============================================${NC}"

ENVIRONMENT=${1:-development}
echo -e "${YELLOW}Ambiente: ${ENVIRONMENT}${NC}"

check_requirements() {
    echo -e "\n${BLUE}[1/6] Verificando requisitos...${NC}"
    
    if command -v node &> /dev/null; then
        echo -e "${GREEN}✓ Node.js: $(node -v)${NC}"
    else
        echo -e "${RED}✗ Node.js no encontrado${NC}"
        exit 1
    fi
    
    if command -v npm &> /dev/null; then
        echo -e "${GREEN}✓ npm: $(npm -v)${NC}"
    else
        echo -e "${RED}✗ npm no encontrado${NC}"
        exit 1
    fi
}

install_dependencies() {
    echo -e "\n${BLUE}[2/6] Instalando dependencias...${NC}"
    
    echo -e "${YELLOW}→ Backend API...${NC}"
    cd backend-api && npm ci && cd ..
    
    echo -e "${YELLOW}→ Frontend Web...${NC}"
    cd eventconnect-frontend && npm ci && cd ..
    
    echo -e "${GREEN}✓ Dependencias instaladas${NC}"
}

check_env() {
    echo -e "\n${BLUE}[3/6] Verificando configuración...${NC}"
    
    if [ -f "backend-api/.env" ]; then
        echo -e "${GREEN}✓ Backend .env existe${NC}"
    else
        echo -e "${RED}✗ backend-api/.env no encontrado${NC}"
        exit 1
    fi
}

build_app() {
    echo -e "\n${BLUE}[4/6] Construyendo aplicación...${NC}"
    cd eventconnect-frontend && npm run build && cd ..
    echo -e "${GREEN}✓ Build completado${NC}"
}

main() {
    check_requirements
    install_dependencies
    check_env
    build_app
    
    echo -e "\n${GREEN}============================================${NC}"
    echo -e "${GREEN}   Build preparado. Este script no publica ni verifica un despliegue.${NC}"
    echo -e "${GREEN}============================================${NC}"
}

main
