/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fija la raíz del proyecto en frontend/ para que `next dev` no infiera
  // el repo padre como workspace y falle al resolver dependencias (tailwindcss).
  // Solo en local: en Vercel el root ya es frontend/ y sobreescribir
  // outputFileTracingRoot rompe el post-procesado del build (ENOENT
  // routes-manifest-deterministic.json buscado en /vercel/path0/.next).
  ...(process.env.VERCEL
    ? {}
    : { turbopack: { root: __dirname }, outputFileTracingRoot: __dirname }),
};

module.exports = nextConfig;
