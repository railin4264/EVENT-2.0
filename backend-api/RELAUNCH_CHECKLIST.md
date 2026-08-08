# EventConnect 2.0 — Relaunch Checklist

Backend verificado funcional (smoke test end-to-end: auth, like/corazón, events,
AI recs, gamification, 2FA, tribes, comments, notifications, chat, search,
stories, dashboard, wallet, follows, subs, analytics, tickets). El único bug
encontrado (chat lookup por `_id` vs `chatId`) ya está arreglado.

## 1. Claves externas que DEBES proveer (en backend-api/.env)

El código ya tiene placeholders. Reemplázalos con valores reales:

| Variable | Dónde conseguirla | Estado |
|----------|-------------------|--------|
| `STRIPE_SECRET_KEY` | Dashboard de Stripe (modo test primero: `sk_test_...`) | ⏳ Pendiente (RD) |
| `STRIPE_WEBHOOK_SECRET` | `stripe listen` / Dashboard webhooks | ⏳ Pendiente |
| `GOOGLE_MAPS_API_KEY` | Google Cloud Console → Maps API | ⏳ Pendiente |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth | ⏳ Pendiente |
| `FIREBASE_PROJECT_ID` + `config/firebase-service-account.json` | Firebase Console → Service Account | ⏳ Pendiente (push notifs) |

Sin estas claves: todo lo demás funciona; solo fallan pagos reales (Stripe),
geocoding de mapas, OAuth de Google y push notifications (Firebase degrada
graceful, no crashea).

## 2. Relaunch (Docker)

```bash
cd backend-api
docker compose up -d --build
# health: curl http://localhost:5000/health  -> 200
```

## 3. Relaunch (local, sin Docker)

```bash
cd backend-api
npm install
# requiere Mongo + Redis corriendo localmente (o usa MMS en dev):
node scripts/start-dev.js   # levanta Mongo en memoria + server en :5077
```

## 4. Frontend (Next.js)

```bash
cd eventconnect-frontend
npm install
npm run build && npm start   # ya verificado: tsc 0 errores de proyecto, build EXIT 0
```

## 5. Mobile (Expo)

```bash
cd mobile-app
npm install
npx expo start
```
