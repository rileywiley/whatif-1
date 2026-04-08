import type { RaceEvent } from '../types';

const EVENT_COLORS: Record<string, { bg: string; color: string }> = {
  SAFETY_CAR: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  VSC: { bg: 'var(--vsc-bg)', color: 'var(--vsc)' },
  RED_FLAG: { bg: 'var(--danger-bg)', color: 'var(--danger)' },
  RAIN_START: { bg: 'var(--info-bg)', color: 'var(--info)' },
};

const EVENT_LABELS: Record<string, string> = {
  SAFETY_CAR: 'SC',
  VSC: 'VSC',
  RED_FLAG: 'RED',
  RAIN_START: 'RAIN',
};

interface EventTimelineProps {
  events: RaceEvent[];
  rainLaps?: number[];
  totalLaps: number;
}

export function EventTimeline({ events, rainLaps = [], totalLaps }: EventTimelineProps) {
  const displayEvents = events.filter(
    (e) => e.event_type === 'SAFETY_CAR' || e.event_type === 'VSC' || e.event_type === 'RED_FLAG'
  );

  // Compute rain ranges from rain_laps
  const rainRanges: { start: number; end: number }[] = [];
  if (rainLaps.length > 0) {
    const sorted = [...rainLaps].sort((a, b) => a - b);
    let start = sorted[0];
    let prev = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - prev > 1) {
        rainRanges.push({ start, end: prev });
        start = sorted[i];
      }
      prev = sorted[i];
    }
    rainRanges.push({ start, end: prev });
  }

  const ticks: number[] = [];
  const step = Math.max(1, Math.round(totalLaps / 10));
  for (let i = 0; i <= totalLaps; i += step) {
    ticks.push(i);
  }
  if (ticks[ticks.length - 1] !== totalLaps) ticks.push(totalLaps);

  return (
    <div style={{ position: 'relative', height: '40px', marginTop: '8px' }}>
      {/* Track bar */}
      <div
        style={{
          position: 'absolute',
          top: '4px',
          left: '64px',
          right: '0',
          height: '20px',
          background: 'var(--bg-surface)',
          borderRadius: '4px',
        }}
      />

      {/* Events */}
      {displayEvents.map((event) => {
        const colors = EVENT_COLORS[event.event_type] ?? EVENT_COLORS.SAFETY_CAR;
        const left = (event.lap_start / totalLaps) * 100;
        const width = ((event.lap_end - event.lap_start + 1) / totalLaps) * 100;
        return (
          <div
            key={event.event_id}
            style={{
              position: 'absolute',
              top: '4px',
              left: `calc(64px + ${left}% * (100% - 64px) / 100%)`,
              width: `calc(${width}% * (100% - 64px) / 100%)`,
              height: '20px',
              background: colors.bg,
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 500,
              color: colors.color,
              zIndex: 1,
              minWidth: '20px',
            }}
            title={`${EVENT_LABELS[event.event_type]} Laps ${event.lap_start}-${event.lap_end}`}
          >
            {EVENT_LABELS[event.event_type]}
          </div>
        );
      })}

      {/* Rain ranges */}
      {rainRanges.map((range, i) => {
        const left = (range.start / totalLaps) * 100;
        const width = ((range.end - range.start + 1) / totalLaps) * 100;
        return (
          <div
            key={`rain-${i}`}
            style={{
              position: 'absolute',
              top: '4px',
              left: `calc(64px + ${left}% * (100% - 64px) / 100%)`,
              width: `calc(${width}% * (100% - 64px) / 100%)`,
              height: '20px',
              background: 'var(--info-bg)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 500,
              color: 'var(--info)',
              zIndex: 0,
              minWidth: '16px',
            }}
            title={`Rain Laps ${range.start}-${range.end}`}
          >
            RAIN
          </div>
        );
      })}

      {/* Tick labels */}
      <div
        style={{
          position: 'absolute',
          top: '28px',
          left: '64px',
          right: '0',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        {ticks.map((t) => (
          <span
            key={t}
            style={{
              fontSize: '10px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
