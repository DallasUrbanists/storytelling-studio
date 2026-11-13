import type { RoadwayWidthResult } from '../../story-core/src/roadway.ts';
import type { RoadwayBand } from '../../project-schema/src/index.ts';

export type RoadwayVariant = 'portrait' | 'landscape';
export type RoadwayBandDrawing = { band: RoadwayBand; x: number; width: number; number: number };
export type RoadwayDrawing = { bands: RoadwayBandDrawing[]; scale: number; totalMeters: number };

/** Fixed short-side coordinates keep the same dimensions in both output variants. */
export function roadwayDrawing(result: RoadwayWidthResult, variant: RoadwayVariant): RoadwayDrawing | null {
  if (variant !== 'portrait' && variant !== 'landscape') throw new Error('Unsupported roadway variant');
  if (result.status === 'infeasible' && result.diagnostics.some(d =>
    ((d.code === 'invalid-width' || d.code === 'unknown-width') && d.constraint === 'band') ||
    d.code === 'numeric-range')) return null;
  const widths = result.bands.map(b => b.width.status === 'unknown' ? NaN : b.width.meters);
  const total = widths.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(total) || total <= 0 || widths.some(w => !Number.isFinite(w) || w <= 0)) return null;
  const scale = 900 / total;
  let x = 90;
  const bands = result.bands.map((band, index) => {
    const width = widths[index] * scale;
    const drawing = { band, x, width, number: index + 1 };
    x += width;
    return drawing;
  });
  return { bands, scale, totalMeters: total };
}
