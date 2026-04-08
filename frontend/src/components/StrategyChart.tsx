import type { DriverEntry } from '../types';

const COMPOUND_COLORS: Record<string, string> = {
  SOFT: '#E24B4A',
  MEDIUM: '#EF9F27',
  HARD: '#8A8A8E',
  INTERMEDIATE: '#5DCAA5',
  WET: '#3B8BD4',
};

const COMPOUND_SHORT: Record<string, string> = {
  SOFT: 'S',
  MEDIUM: 'M',
  HARD: 'H',
  INTERMEDIATE: 'I',
  WET: 'W',
};

interface StrategyChartProps {
  drivers: DriverEntry[];
  totalLaps: number;
  maxDrivers?: number;
  highlightDriver?: string;
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    height: '30px',
  },
  posLabel: {
    width: '20px',
    textAlign: 'right' as const,
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  driverCode: {
    width: '36px',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    letterSpacing: '0.5px',
  },
  stintsContainer: {
    flex: 1,
    display: 'flex',
    gap: '1px',
    height: '26px',
  },
  stintBar: {
    height: '26px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 500,
    color: '#fff',
    overflow: 'hidden',
    whiteSpace: 'nowrap' as const,
  },
};

export function StrategyChart({ drivers, totalLaps, maxDrivers = 10, highlightDriver }: StrategyChartProps) {
  const sorted = [...drivers]
    .filter((d) => d.finish_position != null)
    .sort((a, b) => (a.finish_position ?? 99) - (b.finish_position ?? 99))
    .slice(0, maxDrivers);

  return (
    <div style={styles.container}>
      {sorted.map((driver) => {
        const isHighlight = highlightDriver === driver.driver_id;
        return (
          <div
            key={driver.driver_id}
            style={{
              ...styles.row,
              opacity: highlightDriver && !isHighlight ? 0.4 : 1,
            }}
          >
            <div style={styles.posLabel}>{driver.finish_position}</div>
            <div style={styles.driverCode}>{driver.driver_id}</div>
            <div style={styles.stintsContainer}>
              {driver.stints.map((stint, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.stintBar,
                    width: `${(stint.laps / totalLaps) * 100}%`,
                    background: COMPOUND_COLORS[stint.compound] ?? 'var(--border-subtle)',
                    minWidth: stint.laps > 2 ? '28px' : '12px',
                  }}
                >
                  {stint.laps > 3 && (
                    <span>
                      {COMPOUND_SHORT[stint.compound] ?? '?'} {stint.laps}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
