/**
 * Image Diff Component
 *
 * Unified image comparison with interactive visualization.
 *
 * @example
 * ```svelte
 * <script>
 *   import { DiffCanvas } from '@goobits/goo/diff'
 * </script>
 *
 * <DiffCanvas {imageA} {imageB} />
 * ```
 *
 * @example
 * ```typescript
 * // Headless usage
 * import { compare, renderGradient } from '@goobits/goo/diff'
 *
 * const result = compare(canvasA, canvasB)
 * console.log(`${result.matchPercent.toFixed(1)}% match`)
 *
 * if (result.diffCount > 0) {
 *   const viz = renderGradient(result)
 *   ctx.putImageData(viz, 0, 0)
 * }
 * ```
 */

export { compare, type DiffOptions, type DiffResult } from './compare.ts'
export { default as DiffCanvas } from './DiffCanvas.svelte'
export { renderBinary, renderGradient } from './render.ts'
