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

En `frontend/.env`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

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
