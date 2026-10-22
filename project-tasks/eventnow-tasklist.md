# EVENT NOW 2.0 Development Tasks

## Specification Summary
**Original Requirements**: "La aplicación debe enfocarse en ser una herramienta global extremadamente útil para encontrar actividades locales, especialmente aquellas que son extra-oficiales o comunitarias, permitiendo a los usuarios descubrir eventos que normalmente no aparecen en carteleras formales."
**Technical Stack**: Frontend: Next.js App Router, React, Zustand, React Query | Mobile: React Native, Expo | Backend: Node.js REST API, WebSockets | Despliegue: Docker, Docker Compose
**Target Timeline**: Not specified

## Development Tasks

### [ ] Task 1: Architecture Review & Bug Triage
**Description**: "Revisar y pulir la arquitectura existente para asegurar que todo funcione sin errores. Solucionar cualquier bug en la interfaz o en la API que impida el uso fluido de la aplicación."
**Acceptance Criteria**: 
- Existing API endpoints load without errors.
- Existing frontend views load without errors.
- Known bugs documented and fixed.

**Files to Create/Edit**:
- Codebase-wide review across Node.js API and Next.js frontend

**Reference**: Objetivos Actuales #1, Requerimientos Específicos: Estabilidad General

### [ ] Task 2: Extra-Official Events Backend Support
**Description**: Update database schema and API to support "eventos comunitarios, reuniones informales y actividades locales no oficiales".
**Acceptance Criteria**:
- Database schema supports flagging events as unofficial.
- REST API endpoints allow filtering events by this new unofficial category.

**Files to Create/Edit**:
- Backend Node.js event models/controllers
- REST API routes

**Reference**: Requerimientos Específicos: Funcionalidad de Descubrimiento de Eventos Extra-Oficiales

### [ ] Task 3: Unofficial Events Web Feed
**Description**: "Implementar un Feed o sección destacada para 'Actividades Locales Extra-oficiales'." in the Next.js web application.
**Acceptance Criteria**:
- "Una vista o filtro específico que resalte eventos comunitarios" is implemented.
- Users can toggle to view unofficial events.
- React Query hooks are updated to fetch filtered data.

**Files to Create/Edit**:
- Next.js feed components
- React Query hooks

**Reference**: Objetivos Actuales #2, Requerimientos Específicos: Funcionalidad de Descubrimiento de Eventos Extra-Oficiales

### [ ] Task 4: Optimized Geolocation Implementation
**Description**: "Mejorar la precisión y la experiencia de usuario al buscar eventos 'cerca de mí'."
**Acceptance Criteria**:
- Geolocation API is integrated in the Next.js and Expo clients.
- Backend correctly processes location queries and returns events by proximity.

**Files to Create/Edit**:
- Frontend geolocation hooks
- Backend geospatial queries

**Reference**: Requerimientos Específicos: Geolocalización Optimizada

### [ ] Task 5: Mobile App Integration (React Native/Expo)
**Description**: Ensure the new features (feed, filters, geolocation) work seamlessly in the React Native app.
**Acceptance Criteria**:
- Mobile app includes the filter for unofficial events.
- Mobile UI accurately reflects the web application's new feed features.

**Files to Create/Edit**:
- Expo/React Native components and screens

**Reference**: Stack Técnico: Mobile, Requerimientos Específicos: Funcionalidad de Descubrimiento de Eventos Extra-Oficiales

### [ ] Task 6: QA & Testing
**Description**: "Realizar pruebas exhaustivas en Frontend y Backend para garantizar estabilidad."
**Acceptance Criteria**:
- Core user flows (finding events, applying filters, geolocating) tested on web and mobile.
- "Verificación QA de que la aplicación funciona correctamente."

**Files to Create/Edit**:
- Test suites or manual QA documentation

**Reference**: Objetivos Actuales #4, Entregables: Verificación QA

### [ ] Task 7: Production Readiness
**Description**: "Asegurarse de que el pipeline de Docker y CI/CD esté configurado correctamente para el despliegue."
**Acceptance Criteria**:
- `docker-compose.yml` and `Dockerfile` are configured and working for production.
- Pipeline tests pass for containerized builds.

**Files to Create/Edit**:
- Dockerfile
- docker-compose.yml
- CI/CD workflow configuration

**Reference**: Requerimientos Específicos: Preparación para Producción

## Quality Requirements
- [ ] No background processes in any commands - NEVER append `&`
- [ ] No server startup commands - assume development server running
- [ ] Mobile responsive design required
- [ ] Include Playwright screenshot testing where applicable

## Technical Notes
**Development Stack**: Next.js App Router, React, Zustand, React Query, React Native, Expo, Node.js REST API, WebSockets, Docker, Docker Compose
**Special Instructions**: The main goal is to "Terminar y pulir el proyecto... para que funcione de manera impecable". Do not add premium features not mentioned in the specification.
**Timeline Expectations**: Pending complete finalization for production release.
