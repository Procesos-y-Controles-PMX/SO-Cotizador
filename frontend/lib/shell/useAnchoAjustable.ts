"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Ancho de una columna que el usuario arrastra, al estilo de los paneles de
 * Spotify. El valor se recuerda por columna en localStorage.
 *
 * Usa pointer capture en vez de listeners en `window`: mientras arrastras, el
 * tirador sigue recibiendo los eventos aunque el cursor se salga de él, así que
 * no hay que limpiar nada a mano ni se pierde el arrastre al pasar sobre un
 * iframe o el borde de la ventana.
 */

function acotar(valor: number, min: number, max: number) {
  return Math.min(max, Math.max(min, valor));
}

const PASO_TECLADO = 16;

export function useAnchoAjustable({
  clave,
  inicial,
  min,
  max,
  /** De qué lado del panel vive el tirador: define el signo del arrastre. */
  lado,
}: {
  clave: string;
  inicial: number;
  min: number;
  max: number;
  lado: "izquierda" | "derecha";
}) {
  const [ancho, setAncho] = useState(inicial);
  const [arrastrando, setArrastrando] = useState(false);
  const inicio = useRef({ x: 0, ancho: inicial });

  useEffect(() => {
    try {
      const guardado = Number(window.localStorage.getItem(clave));
      if (Number.isFinite(guardado) && guardado > 0) setAncho(acotar(guardado, min, max));
    } catch {
      /* modo privado: se queda con el ancho por defecto */
    }
  }, [clave, min, max]);

  const persistir = useCallback(
    (valor: number) => {
      try {
        window.localStorage.setItem(clave, String(Math.round(valor)));
      } catch {
        /* el ancho es un lujo, no rompe nada */
      }
    },
    [clave],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      inicio.current = { x: event.clientX, ancho };
      setArrastrando(true);
    },
    [ancho],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!arrastrando) return;
      const delta = (event.clientX - inicio.current.x) * (lado === "derecha" ? -1 : 1);
      setAncho(acotar(inicio.current.ancho + delta, min, max));
    },
    [arrastrando, lado, min, max],
  );

  const terminar = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!arrastrando) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      setArrastrando(false);
      persistir(ancho);
    },
    [arrastrando, ancho, persistir],
  );

  /** Arrastrar con el mouse no debe ser la única forma de ajustar. */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      const signo = lado === "derecha" ? -1 : 1;
      let siguiente: number | null = null;

      if (event.key === "ArrowLeft") siguiente = ancho - PASO_TECLADO * signo;
      if (event.key === "ArrowRight") siguiente = ancho + PASO_TECLADO * signo;
      if (event.key === "Home") siguiente = min;
      if (event.key === "End") siguiente = max;
      if (siguiente === null) return;

      event.preventDefault();
      const valor = acotar(siguiente, min, max);
      setAncho(valor);
      persistir(valor);
    },
    [ancho, lado, min, max, persistir],
  );

  return {
    ancho,
    arrastrando,
    min,
    max,
    tiradorProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: terminar,
      onPointerCancel: terminar,
      onKeyDown,
    },
  };
}
