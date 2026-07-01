import Image from "next/image";

interface PromexmaLogotipoProps {
  productLabel: string;
  variant?: "dark" | "light";
}

export default function PromexmaLogotipo({
  productLabel,
  variant = "dark",
}: PromexmaLogotipoProps) {
  const isDark = variant === "dark";

  return (
    <div>
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
              ? "h-16 xl:h-20 w-auto"
              : "h-10 sm:h-11 w-auto"
          }
          priority
        />
      </div>
      <p
        className={
          isDark
            ? "mt-3 text-base text-white/55 tracking-wide"
            : "mt-2 text-sm text-slate-400 tracking-wide"
        }
      >
        {productLabel}
      </p>
    </div>
  );
}
