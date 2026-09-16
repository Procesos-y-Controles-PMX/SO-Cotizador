"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CustomAmbientNoise } from "@/lib/ambient-noise";

export type SpinnerOrigin = [number, number];

/** Fallback until a BrandLoader measures the visible landing mid-point. */
export const DEFAULT_SPINNER_ORIGIN: SpinnerOrigin = [0.5, 0.55];

function originsClose(a: SpinnerOrigin, b: SpinnerOrigin, eps = 0.02) {
  return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;
}

type AmbientGridContextValue = {
  /** True while at least one loader requested the canvas spinner. */
  spinner: boolean;
  /**
   * Whether this user gets the animated ambient field at all. Off unless
   * they are the owner or have a custom profile, and loaders honor it so a
   * local fallback field does not smuggle the animation back in.
   */
  animated: boolean;
  /** Extra NoiseField props for a per-user profile, if any. */
  fieldProps: CustomAmbientNoise | null;
  /** Shell ambient mesh is mounted and can host the spinner. */
  meshReady: boolean;
  /** Orbit center as fractions of the ambient clip box. */
  spinnerOrigin: SpinnerOrigin;
  /**
   * Ref-count acquire. Origin is updated separately so prop churn does not
   * tear down / restart the mesh orbit RAF.
   */
  acquireSpinner: () => () => void;
  setSpinnerOrigin: (origin: SpinnerOrigin) => void;
};

const AmbientGridContext = createContext<AmbientGridContextValue | null>(null);

export function AmbientGridProvider({
  meshReady,
  animated = true,
  fieldProps = null,
  children,
}: {
  meshReady: boolean;
  animated?: boolean;
  fieldProps?: CustomAmbientNoise | null;
  children: ReactNode;
}) {
  const [count, setCount] = useState(0);
  const [spinnerOrigin, setOriginState] = useState<SpinnerOrigin>(DEFAULT_SPINNER_ORIGIN);

  const acquireSpinner = useCallback(() => {
    setCount((n) => n + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      setCount((n) => {
        const next = Math.max(0, n - 1);
        if (next === 0) setOriginState(DEFAULT_SPINNER_ORIGIN);
        return next;
      });
    };
  }, []);

  const setSpinnerOrigin = useCallback((origin: SpinnerOrigin) => {
    setOriginState((prev) => (originsClose(prev, origin) ? prev : origin));
  }, []);

  const value = useMemo(
    () => ({
      spinner: count > 0,
      meshReady: meshReady && animated,
      animated,
      fieldProps,
      spinnerOrigin,
      acquireSpinner,
      setSpinnerOrigin,
    }),
    [count, meshReady, animated, fieldProps, spinnerOrigin, acquireSpinner, setSpinnerOrigin],
  );

  return (
    <AmbientGridContext.Provider value={value}>{children}</AmbientGridContext.Provider>
  );
}

export function useAmbientGrid() {
  return useContext(AmbientGridContext);
}

/**
 * While `active`, drives the shell ambient mesh spinner.
 * Pass `origin` (0–1 in clip space) to center on the visible loading slot.
 */
export function useAmbientGridSpinner(active: boolean, origin?: SpinnerOrigin) {
  const ctx = useAmbientGrid();
  const ox = origin?.[0];
  const oy = origin?.[1];

  useEffect(() => {
    if (!active || !ctx) return;
    return ctx.acquireSpinner();
  }, [active, ctx]);

  useEffect(() => {
    if (!active || !ctx) return;
    if (ox == null || oy == null) return;
    ctx.setSpinnerOrigin([ox, oy]);
  }, [active, ctx, ox, oy]);
}
