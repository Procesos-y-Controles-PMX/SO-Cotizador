"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SMOOTH_DRAWER_ITEM_VARIANTS, SMOOTH_DRAWER_VARIANTS } from "@/lib/smoothDrawerMotion";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  /** Wider panel for data-heavy breakdowns. */
  wide?: boolean;
}

export default function Modal({ open, onClose, title, children, actions, wide = false }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          className="fixed inset-0 z-[100] flex h-[100dvh] w-full items-end justify-center p-0 sm:items-center sm:p-4 md:p-8"
          initial={reduceMotion ? undefined : "hidden"}
          animate={reduceMotion ? undefined : "visible"}
          exit={reduceMotion ? undefined : "hidden"}
          onClick={(e) => {
            if (e.target === overlayRef.current) onClose();
          }}
        >
          <motion.div
            className="absolute inset-0 h-full w-full bg-black/40 backdrop-blur-sm"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.div
            className={`relative flex max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-bottom)))] w-full flex-col overflow-hidden self-end rounded-t-sm bg-white shadow-2xl sm:max-h-[calc(100dvh-4rem)] sm:self-center sm:rounded-sm ${wide ? "max-w-2xl" : "max-w-lg"}`}
            variants={SMOOTH_DRAWER_VARIANTS}
          >
            <motion.div
              className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6"
              variants={SMOOTH_DRAWER_ITEM_VARIANTS}
            >
              <h3 className="font-display text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Cerrar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </motion.div>

            <motion.div
              className="min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-5 sm:px-6"
              variants={SMOOTH_DRAWER_ITEM_VARIANTS}
            >
              {children}
            </motion.div>

            {actions ? (
              <motion.div
                className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6"
                variants={SMOOTH_DRAWER_ITEM_VARIANTS}
              >
                {actions}
              </motion.div>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
