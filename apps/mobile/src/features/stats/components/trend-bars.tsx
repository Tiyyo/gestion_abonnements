import Svg, { Line, Path, Rect } from 'react-native-svg';
import type { TrendMonth } from '@/db/repositories/stats-trend';
import { barHeights, barPath, CHART, CHART_HEIGHT, gridTicks, yForCents } from '@/features/stats/trend-scale';
import { colors } from '@/theme/colors';

interface Props {
  months: readonly TrendMonth[];
  axisMaxCents: number;
  columnWidth: number;
  selectedIndex: number;
}

/** Une seule teinte : mois en cours plein, mois passés adoucis, part prévue claire à contour pointillé. */
const PAST_OPACITY = 0.55;
const PLANNED_FILL_OPACITY = 0.14;
const PLANNED_STROKE = 1.5;

/** Tracé du graphique : repères, bande du mois choisi, barres. Ne reçoit aucun toucher (les colonnes sont au-dessus). */
export function TrendBars({ months, axisMaxCents, columnWidth, selectedIndex }: Props) {
  const width = columnWidth * months.length;
  const baseline = CHART.topPad + CHART.plotHeight;
  const inset = (columnWidth - CHART.barWidth) / 2;
  const last = months.length - 1;

  return (
    <Svg width={width} height={CHART_HEIGHT} pointerEvents="none">
      {selectedIndex >= 0 ? (
        <Rect
          x={selectedIndex * columnWidth + 3}
          y={2}
          width={columnWidth - 6}
          height={CHART_HEIGHT - 4}
          rx={10}
          fill={colors.primarySoft}
        />
      ) : null}
      {gridTicks(axisMaxCents).map((tick) => {
        const y = yForCents(tick, axisMaxCents);
        return <Line key={tick} x1={0} x2={width} y1={y} y2={y} stroke={colors.border} strokeWidth={1} />;
      })}
      {months.map((m, i) => {
        const h = barHeights(m.paidCents, m.plannedCents, axisMaxCents);
        const x = i * columnWidth + inset;
        const paid = barPath(x, baseline, CHART.barWidth, h.paid, h.planned === 0);
        // Le contour pointillé est rentré d'une demi-épaisseur pour rester dans la largeur de la barre.
        const half = PLANNED_STROKE / 2;
        const planned = barPath(x + half, baseline - h.paid, CHART.barWidth - PLANNED_STROKE, h.planned - half, true);
        return [
          paid ? <Path key={`${m.month}-paid`} d={paid} fill={colors.primary} fillOpacity={i === last ? 1 : PAST_OPACITY} /> : null,
          planned ? (
            <Path
              key={`${m.month}-planned`}
              d={planned}
              fill={colors.primary}
              fillOpacity={PLANNED_FILL_OPACITY}
              stroke={colors.primary}
              strokeWidth={PLANNED_STROKE}
              strokeDasharray="3 3"
            />
          ) : null,
        ];
      })}
    </Svg>
  );
}
