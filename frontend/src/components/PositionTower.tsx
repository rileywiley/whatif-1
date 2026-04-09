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

const COMPOUND_SHORT: Record<string, string> = {
  SOFT: 'S',
  MEDIUM: 'M',
  HARD: 'H',
  INTERMEDIATE: 'I',
  WET: 'W',
};

function formatTime(seconds: number): string {
  if (seconds <= 0) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : secs;
}

function formatGap(gap: number): string {
  if (gap === 0) return 'LEADER';
  return `+${gap.toFixed(1)}s`;
}

export function PositionTower({ drivers, currentLap: _currentLap, showActualDelta = true }: PositionTowerProps) {
  const sorted = [...drivers].sort((a, b) => a.position - b.position);

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '24px 10px 40px 44px 1fr 68px 56px 36px',
          gap: '6px',
          padding: '4px 0 8px 0',
          borderBottom: '0.5px solid var(--border-subtle)',
          fontSize: '10px',
          fontWeight: 400,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        <span>P</span>
        <span />
        <span>Driver</span>
        <span>Tyre</span>
        <span />
        <span style={{ textAlign: 'right' }}>Time</span>
        <span style={{ textAlign: 'right' }}>Gap</span>
        <span style={{ textAlign: 'right' }}>{showActualDelta ? '+/-' : ''}</span>
      </div>

      {sorted.map((driver) => {
        const delta = showActualDelta ? driver.actual_position - driver.position : 0;
        const compoundColor = COMPOUND_COLORS[driver.tyre_compound] ?? 'var(--text-muted)';
        const compoundLetter = COMPOUND_SHORT[driver.tyre_compound] ?? '?';
        const isPitting = driver.is_pitting ?? false;

        return (
          <div
            key={driver.driver_id}
            style={{
              display: 'grid',
              gridTemplateColumns: '24px 10px 40px 44px 1fr 68px 56px 36px',
              gap: '6px',
              padding: '7px 0',
              borderBottom: '0.5px solid var(--bg-surface)',
              fontSize: '13px',
              alignItems: 'center',
              background: isPitting ? 'var(--bg-surface)' : 'transparent',
              borderRadius: isPitting ? '4px' : '0',
            }}
          >
            {/* Position */}
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
              {driver.position}
            </div>

            {/* Team dot */}
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: driver.team_color }} />

            {/* Driver code */}
            <div style={{ fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
              {driver.driver_id}
            </div>

            {/* Tyre compound badge + age */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <div
                style={{
                  background: compoundColor,
                  color: '#fff',
                  borderRadius: '3px',
                  padding: '1px 5px',
                  fontSize: '10px',
                  fontWeight: 500,
                  lineHeight: '14px',
                }}
              >
                {compoundLetter}
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {driver.tyre_age}
              </span>
              {isPitting && (
                <span style={{ fontSize: '9px', fontWeight: 500, color: 'var(--warning)', letterSpacing: '0.5px' }}>
                  PIT
                </span>
              )}
            </div>

            {/* Pace bar */}
            <div style={{ height: '4px', background: 'var(--bg-surface)', borderRadius: '2px', overflow: 'hidden' }}>
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
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'right' }}>
              {formatTime(driver.lap_time)}
            </div>

            {/* Gap to leader */}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
              {formatGap(driver.gap_to_leader)}
            </div>

            {/* Delta vs actual */}
            {showActualDelta && (
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  textAlign: 'right',
                  fontFamily: 'var(--font-mono)',
                  color: delta > 0 ? 'var(--accent)' : delta < 0 ? 'var(--danger)' : 'var(--text-muted)',
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
