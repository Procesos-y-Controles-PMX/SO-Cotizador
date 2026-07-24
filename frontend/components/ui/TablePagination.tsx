"use client";

import { PAGE_SIZE, pageDisplayRange, totalPages } from "@/lib/pagination";
import { BTN_SECONDARY } from "@/components/ui/contentStyles";

type Props = {
  page: number;
  total: number;
  pageSize?: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
};

export default function TablePagination({
  page,
  total,
  pageSize = PAGE_SIZE,
  loading = false,
  onPageChange,
}: Props) {
  if (total <= 0) return null;

  const pages = totalPages(total, pageSize);
  const { from, to } = pageDisplayRange(page, total, pageSize);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-fg-subtle">
        Mostrando {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={loading || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={`${BTN_SECONDARY} !w-auto min-w-[5.5rem] py-2`}
        >
          Anterior
        </button>
        <span className="text-sm text-fg-muted">
          Página {page} de {pages}
        </span>
        <button
          type="button"
          disabled={loading || page >= pages}
          onClick={() => onPageChange(page + 1)}
          className={`${BTN_SECONDARY} !w-auto min-w-[5.5rem] py-2`}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
