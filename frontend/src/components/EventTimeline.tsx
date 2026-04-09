import type { RaceEvent } from '../types';

const EVENT_COLORS: Record<string, { bg: string; border: string; color: string }> = {
  SAFETY_CAR: { bg: 'var(--warning-bg)', border: 'var(--warning-border)', color: 'var(--warning)' },
  VSC: { bg: 'var(--vsc-bg)', border: 'var(--vsc-border)', color: 'var(--vsc)' },
  RED_FLAG: { bg: 'var(--danger-bg)', border: 'var(--danger-border)', color: 'var(--danger)' },
};

const EVENT_LABELS: Record<string, string> = {
  SAFETY_CAR: 'SC',
  VSC: 'VSC',
  RED_FLAG: 'RED',
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

  const pct = (lap: number) => `${(lap / totalLaps) * 100}%`;
  const widthPct = (start: number, end: number) => `${((end - start + 1) / totalLaps) * 100}%`;

  return (
    <div>
      {/* Timeline bar */}
      <div style={{ position: 'relative', height: '28px', background: 'var(--bg-surface)', borderRadius: '4px' }}>
        {/* Event blocks */}
        {displayEvents.map((event) => {
          const colors = EVENT_COLORS[event.event_type] ?? EVENT_COLORS.SAFETY_CAR;
          return (
            <div
              key={event.event_id}
              style={{
                position: 'absolute',
                top: 0,
                left: pct(event.lap_start - 1),
                width: widthPct(event.lap_start, event.lap_end),
                height: '100%',
                background: colors.bg,
                border: `0.5px solid ${colors.border}`,
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 500,
                color: colors.color,
                zIndex: 2,
                minWidth: '20px',
              }}
              title={`${EVENT_LABELS[event.event_type]} Laps ${event.lap_start}-${event.lap_end}`}
            >
              {EVENT_LABELS[event.event_type]} {event.lap_start}-{event.lap_end}
            </div>
          );
        })}

        {/* Rain ranges */}
        {rainRanges.map((range, i) => (
          <div
            key={`rain-${i}`}
            style={{
              position: 'absolute',
              top: 0,
              left: pct(range.start - 1),
              width: widthPct(range.start, range.end),
              height: '100%',
              background: 'var(--info-bg)',
              border: '0.5px solid var(--info-border)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 500,
              color: 'var(--info)',
              zIndex: 1,
              minWidth: '16px',
            }}
            title={`Rain Laps ${range.start}-${range.end}`}
          >
            Rain
          </div>
        ))}
      </div>

      {/* Tick labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
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
