/** Top-level routes in sidebar order — drives directional page transitions. */
export const MODULE_ORDER: readonly string[] = [
  '/dashboard',
  '/cotizaciones',
  '/cotizaciones/nueva',
  '/inventario',
  '/usuarios',
]

export function moduleIndexForPath(pathname: string): number {
  let bestIndex = -1
  let bestLen = -1
  MODULE_ORDER.forEach((href, index) => {
    if ((pathname === href || pathname.startsWith(`${href}/`)) && href.length > bestLen) {
      bestLen = href.length
      bestIndex = index
    }
  })
  return bestIndex
}
