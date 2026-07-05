/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fija la raíz del proyecto en frontend/ para que `next dev` no infiera
  // el repo padre como workspace y falle al resolver dependencias (tailwindcss).
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
};

module.exports = nextConfig;
