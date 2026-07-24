import Image from "next/image";

interface PromexmaLogotipoProps {
  productLabel: string;
  variant?: "dark" | "light";
  align?: "left" | "center";
}

export default function PromexmaLogotipo({
  productLabel,
  variant = "dark",
  align = "left",
}: PromexmaLogotipoProps) {
  const isDark = variant === "dark";
  const centered = align === "center";

  return (
    <div className={centered ? "flex flex-col items-center text-center" : undefined}>
      <div
        className={
          isDark
            ? "inline-flex"
            : "inline-flex rounded-lg bg-[#0d1117] px-4 py-2.5"
        }
      >
        <Image
          src="/promexma-logotipo.png"
          alt="Promexma"
          width={480}
          height={120}
          className={
            isDark
              ? "h-14 sm:h-16 xl:h-20 w-auto max-w-[min(100%,280px)]"
              : "h-10 sm:h-11 w-auto"
          }
          priority
        />
      </div>
      <p
        className={
          isDark
            ? "mt-2.5 sm:mt-3 text-sm sm:text-base text-white/55 tracking-wide"
            : "mt-2 text-sm text-fg-faint tracking-wide"
        }
      >
        {productLabel}
      </p>
    </div>
  );
}
