import type { DriverReplayState } from '../types';

interface PositionTowerProps {
  drivers: DriverReplayState[];
  currentLap: number;
  showActualDelta?: boolean;
}

const COMPOUND_COLORS: Record<string, string> = {
  SOFT: '#E24B4A',
  MEDIUM: '#EF9F27',
  HARD: '#8A8A8E',
  INTERMEDIATE: '#5DCAA5',
  WET: '#3B8BD4',
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : secs;
}

function formatGap(gap: number): string {
  if (gap === 0) return '';
  return `+${gap.toFixed(1)}`;
}

export function PositionTower({ drivers, currentLap: _currentLap, showActualDelta = true }: PositionTowerProps) {
  const sorted = [...drivers].sort((a, b) => a.position - b.position);

  return (
    <div>
      {sorted.map((driver) => {
        const delta = showActualDelta ? driver.actual_position - driver.position : 0;
        return (
          <div
            key={driver.driver_id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 0',
              borderBottom: '0.5px solid var(--bg-surface)',
              fontSize: '13px',
            }}
          >
            {/* Position */}
            <div
              style={{
                width: '20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '12px',
              }}
            >
              {driver.position}
            </div>

            {/* Team dot */}
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: driver.team_color,
                flexShrink: 0,
              }}
            />

            {/* Driver code */}
            <div
              style={{
                width: '36px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                letterSpacing: '0.5px',
              }}
            >
              {driver.driver_id}
            </div>

            {/* Tyre badge */}
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: COMPOUND_COLORS[driver.tyre_compound] ?? 'var(--text-muted)',
                flexShrink: 0,
              }}
              title={`${driver.tyre_compound} (${driver.tyre_age} laps)`}
            />

            {/* Pace bar */}
            <div
              style={{
                flex: 1,
                height: '4px',
                background: 'var(--bg-surface)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${driver.pace_relative * 100}%`,
                  height: '100%',
                  background: driver.team_color,
                  borderRadius: '2px',
                }}
              />
            </div>

            {/* Lap time */}
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--text-tertiary)',
                width: '64px',
                textAlign: 'right',
              }}
            >
              {formatTime(driver.lap_time)}
            </div>

            {/* Gap to leader */}
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--text-muted)',
                width: '48px',
                textAlign: 'right',
              }}
            >
              {formatGap(driver.gap_to_leader)}
            </div>

            {/* Delta vs actual */}
            {showActualDelta && (
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  width: '32px',
                  textAlign: 'right',
                  color:
                    delta > 0
                      ? 'var(--accent)'
                      : delta < 0
                        ? 'var(--danger)'
                        : 'var(--text-muted)',
                }}
              >
                {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '-'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
