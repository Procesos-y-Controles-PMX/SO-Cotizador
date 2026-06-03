/** Contraseñas sencillas para alta/import (texto plano, sin hash). */

export const MIN_USUARIO_PASSWORD_LENGTH = 4;

const SIMPLE_WORDS = [
  "sol",
  "luna",
  "rio",
  "mar",
  "mesa",
  "casa",
  "flor",
  "mango",
  "pera",
  "nube",
  "roca",
  "viento",
  "brisa",
  "campo",
  "puerta",
  "ventana",
  "camino",
  "bosque",
  "toro",
  "gato",
  "perro",
  "pato",
  "leon",
  "tigre",
  "lobo",
  "zorro",
  "ciervo",
  "aguila",
  "colibri",
  "jaguar",
  "mapa",
  "pluma",
  "coral",
  "arena",
  "olivo",
  "cedro",
  "pino",
  "roble",
  "trigo",
  "maiz",
  "fresa",
  "uva",
  "coco",
  "lima",
  "melon",
  "papaya",
  "cafe",
  "miel",
  "azul",
  "verde",
  "rojo",
  "plata",
  "oro",
  "cobre",
  "norte",
  "sur",
  "este",
  "oeste",
];

export function generateSimplePassword(): string {
  const word = SIMPLE_WORDS[Math.floor(Math.random() * SIMPLE_WORDS.length)];
  const digits = String(Math.floor(10 + Math.random() * 90));
  return `${word}${digits}`;
}

export function isValidUsuarioPassword(password: string): boolean {
  return password.trim().length >= MIN_USUARIO_PASSWORD_LENGTH;
}
