# SO Cotizador

Aplicacion web de cotizaciones para Promexma.

## Stack actual

- Frontend: Next.js + TypeScript + Tailwind + Supabase JS
- Base de datos: Supabase (`ctz_*`)
- PDF: `@react-pdf/renderer`
- Backend: carpeta disponible, pero no requerida para el flujo actual

## Requisitos

- Node.js 20 recomendado

## Arranque rapido

```bash
cd frontend
npm install
npm run dev
```

## Variables de entorno

En `frontend/.env` (local) o en Vercel → Project Settings → Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — **requerida** para login y para todas las APIs de `ctz_*` (no usar prefijo `NEXT_PUBLIC_`)

Sin `SUPABASE_SERVICE_ROLE_KEY` en Vercel, login y lecturas/escrituras de cotizaciones, usuarios, sucursales y productos fallarán. El frontend ya no consulta `ctz_*` con la anon key.

## Flujo principal

- `GET /` redirige a `/login`
- Login por correo y contraseña
- Modulo de cotizaciones:
  - `/cotizaciones`
  - `/cotizaciones/nueva`
  - `/cotizaciones/[id]`
  - `/cotizaciones/[id]/pdf`

- Inventario (solo admin):
  - `/inventario`
