"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface MouseState {
  x: number;
  y: number;
  tx: number;
  ty: number;
  active: boolean;
}

export interface MagazineDotsProps {
  className?: string;
  children?: ReactNode;
  /** Dot pitch in CSS pixels — smaller = denser halftone. */
  spacing?: number;
  interactive?: boolean;
  /** Idle breathing animation on the dot field. */
  pulse?: boolean;
}

const MOUSE_RADIUS = 210;
const PULSE_ORIGIN_COUNT = 3;
const PULSE_RADIUS = 235;

interface PulseOrigin {
  x: number;
  y: number;
  phase: number;
  speed: number;
  born: number;
  life: number;
}

function isOriginActive(origin: PulseOrigin, elapsed: number): boolean {
  const age = elapsed - origin.born;
  return age >= 0 && age <= origin.life;
}

function spawnPulseOrigin(
  width: number,
  height: number,
  elapsed: number,
  others: PulseOrigin[] = [],
): PulseOrigin {
  const margin = 0.15;
  const minSeparation = Math.min(width, height) * 0.42;

  for (let attempt = 0; attempt < 28; attempt++) {
    const x = width * (margin + Math.random() * (1 - margin * 2));
    const y = height * (margin + Math.random() * (1 - margin * 2));

    const separated = others.every((other) => {
      if (!isOriginActive(other, elapsed)) return true;
      return Math.hypot(x - other.x, y - other.y) >= minSeparation;
    });

    if (separated) {
      return {
        x,
        y,
        phase: Math.random() * Math.PI * 2,
        speed: 0.65 + Math.random() * 0.55,
        born: elapsed,
        life: 6 + Math.random() * 5,
      };
    }
  }

  return {
    x: width * (margin + Math.random() * (1 - margin * 2)),
    y: height * (margin + Math.random() * (1 - margin * 2)),
    phase: Math.random() * Math.PI * 2,
    speed: 0.65 + Math.random() * 0.55,
    born: elapsed,
    life: 6 + Math.random() * 5,
  };
}

function initPulseOrigins(width: number, height: number): PulseOrigin[] {
  const origins: PulseOrigin[] = [];
  const avgLife = 8.5;

  for (let index = 0; index < PULSE_ORIGIN_COUNT; index++) {
    const origin = spawnPulseOrigin(width, height, 0, origins);
    origin.born = -index * avgLife;
    origins.push(origin);
  }

  return origins;
}

function pulseBoostAt(
  x: number,
  y: number,
  elapsed: number,
  origins: PulseOrigin[],
): number {
  let boost = 0;

  for (const origin of origins) {
    const age = elapsed - origin.born;
    if (age < 0 || age > origin.life) continue;

    const dx = x - origin.x;
    const dy = y - origin.y;
    const dist = Math.hypot(dx, dy);
    if (dist > PULSE_RADIUS) continue;

    const lifeFade = 1 - age / origin.life;
    const radial = (1 - dist / PULSE_RADIUS) ** 1.7;
    const ripple =
      0.5 +
      0.5 * Math.sin(dist * 0.052 - elapsed * origin.speed * 2.4 + origin.phase);

    boost += Math.max(0, ripple) * radial * lifeFade;
  }

  return Math.min(boost * 0.88, 1.15);
}

const FALLBACK = {
  bg: "#0d1117",
  brand: "#ED1C24",
  brandHover: "#c9171e",
  steel: "#34507A",
  steelDim: "#5277a6",
} as const;

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.trim().replace("#", "");
  if (normalized.length !== 6) return [237, 28, 36];
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function readCssColor(variable: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
  return value || fallback;
}

function readTheme() {
  const bgHex = readCssColor("--console-bg", FALLBACK.bg);
  const [bgR, bgG, bgB] = hexToRgb(bgHex);
  return {
    bg: `${bgR}, ${bgG}, ${bgB}`,
    brand: hexToRgb(readCssColor("--brand", FALLBACK.brand)),
    brandHover: hexToRgb(readCssColor("--brand-hover", FALLBACK.brandHover)),
    steel: hexToRgb(readCssColor("--steel", FALLBACK.steel)),
    steelDim: hexToRgb(readCssColor("--viz-seq-4", FALLBACK.steelDim)),
  };
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  const blend = Math.min(1, Math.max(0, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * blend),
    Math.round(a[1] + (b[1] - a[1]) * blend),
    Math.round(a[2] + (b[2] - a[2]) * blend),
  ];
}

/** Stable 0–1 hash for per-dot print variation. */
function cellHash(col: number, row: number): number {
  const v = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

interface FieldDot {
  x: number;
  y: number;
  grain: number;
  baseOpacity: number;
}

/** Same sparse field logic as AppCanvasMouseBackdrop — spacing grid with gaps zone to zone. */
function generateFieldDots(width: number, height: number, spacing: number): FieldDot[] {
  const dots: FieldDot[] = [];
  const cols = Math.ceil(width / spacing);
  const rows = Math.ceil(height / spacing);
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDistance = Math.hypot(centerX, centerY);

  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= cols; col++) {
      const x = col * spacing;
      const y = row * spacing;
      const edgeFactor = Math.min(
        Math.hypot(x - centerX, y - centerY) / (maxDistance * 0.8),
        1,
      );
      if (Math.random() > edgeFactor * 0.7) continue;

      const nx = x / width;
      const ny = y / height;
      const zone =
        0.52 +
        0.24 * Math.sin(nx * 5.8 + ny * 3.4) +
        0.18 * Math.cos(nx * 3.1 - ny * 4.6);
      if (zone < 0.38 && Math.random() > 0.22) continue;

      dots.push({
        x,
        y,
        grain: cellHash(col, row),
        baseOpacity: 0.22 + edgeFactor * 0.38,
      });
    }
  }

  return dots;
}

export default function MagazineDots({
  className,
  children,
  spacing = 20,
  interactive = true,
  pulse = true,
}: MagazineDotsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<MouseState>({
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    active: false,
  });
  const mouseStrengthRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.style.setProperty("--dots-mx", "50%");
    container.style.setProperty("--dots-my", "50%");

    if (!interactive) return;

    const onMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      mouseRef.current.tx = x;
      mouseRef.current.ty = y;
      mouseRef.current.active = true;
      mouseStrengthRef.current = 1;
      container.style.setProperty("--dots-mx", `${x}px`);
      container.style.setProperty("--dots-my", `${y}px`);
    };

    const onLeave = () => {
      mouseRef.current.active = false;
    };

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseleave", onLeave);

    return () => {
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
    };
  }, [interactive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const theme = readTheme();
    const dpr = window.devicePixelRatio ?? 1;

    let width = 0;
    let height = 0;
    let animId = 0;
    let pulseOrigins: PulseOrigin[] = [];
    let fieldDots: FieldDot[] = [];
    const startTime = performance.now();

    const resize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      pulseOrigins = initPulseOrigins(width, height);
      fieldDots = generateFieldDots(width, height, spacing);

      const mouse = mouseRef.current;
      mouse.x = width / 2;
      mouse.y = height / 2;
      mouse.tx = mouse.x;
      mouse.ty = mouse.y;
    };

    const draw = (now: number) => {
      const elapsed = (now - startTime) / 1000;

      const mouse = mouseRef.current;
      mouse.x += (mouse.tx - mouse.x) * 0.12;
      mouse.y += (mouse.ty - mouse.y) * 0.12;

      if (interactive && mouse.active) {
        mouseStrengthRef.current = Math.min(1, mouseStrengthRef.current + 0.08);
      } else {
        mouseStrengthRef.current = Math.max(0, mouseStrengthRef.current - 0.025);
      }

      if (pulse) {
        for (let i = 0; i < pulseOrigins.length; i++) {
          if (elapsed - pulseOrigins[i].born > pulseOrigins[i].life) {
            pulseOrigins[i] = spawnPulseOrigin(width, height, elapsed, pulseOrigins);
          }
        }
      }

      const drift = elapsed * 0.55;

      ctx.fillStyle = `rgb(${theme.bg})`;
      ctx.fillRect(0, 0, width, height);

      if (pulse) {
        for (const origin of pulseOrigins) {
          const age = elapsed - origin.born;
          if (age < 0 || age > origin.life) continue;

          const lifeFade = 1 - age / origin.life;
          const glowR = PULSE_RADIUS * (0.55 + age * 0.12);
          const [br, bg, bb] = theme.brand;
          const grad = ctx.createRadialGradient(
            origin.x,
            origin.y,
            0,
            origin.x,
            origin.y,
            glowR,
          );
          grad.addColorStop(0, `rgba(${br}, ${bg}, ${bb}, ${0.22 * lifeFade})`);
          grad.addColorStop(0.35, `rgba(${br}, ${bg}, ${bb}, ${0.08 * lifeFade})`);
          grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(origin.x, origin.y, glowR, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const dot of fieldDots) {
          const baseX = dot.x;
          const baseY = dot.y;

          const nx = baseX / width;
          const ny = baseY / height;
          const plate =
            0.42 +
            0.28 * Math.sin(nx * 5.2 + ny * 3.1 + drift) +
            0.14 * Math.cos(nx * 2.4 - ny * 4.8 + drift * 0.7);
          const grain = dot.grain;

          const rippleBoost = pulse
            ? pulseBoostAt(baseX, baseY, elapsed, pulseOrigins)
            : 0;

          let mousePull = 0;

          if (interactive && mouseStrengthRef.current > 0.01) {
            const dx = baseX - mouse.x;
            const dy = baseY - mouse.y;
            const dist = Math.hypot(dx, dy);

            if (dist < MOUSE_RADIUS) {
              mousePull =
                (1 - dist / MOUSE_RADIUS) ** 2 * mouseStrengthRef.current;
            }
          }

          const drawX = baseX + (mouse.x - baseX) * mousePull * 0.08;
          const drawY = baseY + (mouse.y - baseY) * mousePull * 0.08;

          const radius =
            0.9 +
            plate * 0.55 +
            grain * 0.25 +
            rippleBoost * 1.75 +
            mousePull * 2.4;
          const alpha =
            dot.baseOpacity * 0.55 +
            plate * 0.12 +
            rippleBoost * 0.48 +
            mousePull * 0.62;

          const steelBase = mixRgb(theme.steelDim, theme.steel, plate);
          const brandTint = mixRgb(theme.brand, theme.brandHover, grain);
          const hotBrand = mixRgb(theme.brand, [255, 120, 120], rippleBoost);
          const rgb =
            rippleBoost > 0.04
              ? mixRgb(
                  mixRgb(steelBase, brandTint, 0.25),
                  hotBrand,
                  Math.min(rippleBoost * 0.92 + 0.08, 1),
                )
              : mixRgb(steelBase, brandTint, grain * 0.12);
          const finalRgb = mixRgb(rgb, brandTint, mousePull * 0.92);

          ctx.beginPath();
          ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${finalRgb[0]}, ${finalRgb[1]}, ${finalRgb[2]}, ${Math.min(alpha, 0.98)})`;
          ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [spacing, interactive, pulse]);

  const bgColor = readTheme().bg;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex min-h-screen w-full items-center justify-center overflow-hidden",
        className,
      )}
      style={{ background: `rgb(${bgColor})` }}
    >
      <canvas
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        ref={canvasRef}
      />

      {interactive && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 200px at var(--dots-mx, 50%) var(--dots-my, 50%), rgba(237, 28, 36, 0.14), transparent 70%)`,
          }}
        />
      )}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 88% 82% at 50% 50%, transparent 42%, rgba(${bgColor}, 0.72) 100%)`,
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-20"
        style={{
          background: `linear-gradient(to bottom, rgb(${bgColor}), transparent)`,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
        style={{
          background: `linear-gradient(to top, rgb(${bgColor}), transparent)`,
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {children}
    </div>
  );
}
