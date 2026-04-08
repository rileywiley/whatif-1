import { useState } from 'react';
import { useAppStore } from '../store';
import { Button } from './common/Button';
import type { DriverEntry, RaceEvent } from '../types';

interface AdvancedEditorProps {
  drivers: DriverEntry[];
  events: RaceEvent[];
  totalLaps: number;
  raceId: string;
  onSimulate: () => void;
  loading: boolean;
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '0.5px solid var(--border-subtle)',
  borderRadius: '6px',
  padding: '8px 12px',
  color: 'var(--text-primary)',
  fontSize: '13px',
  fontWeight: 300,
  width: '100%',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 400,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: '6px',
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'pointer',
  padding: '10px 0',
  borderBottom: '0.5px solid var(--border-subtle)',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 500,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
};

const chevronStyle = (open: boolean): React.CSSProperties => ({
  fontSize: '10px',
  color: 'var(--text-muted)',
  transform: open ? 'rotate(180deg)' : 'rotate(0)',
  transition: 'transform 0.15s',
});

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <div style={sectionHeaderStyle} onClick={() => setOpen(!open)}>
        <span style={sectionTitleStyle}>{title}</span>
        <span style={chevronStyle(open)}>&#9660;</span>
      </div>
      {open && <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>{children}</div>}
    </div>
  );
}

export function AdvancedEditor({ drivers, events, totalLaps: _totalLaps, raceId: _raceId, onSimulate, loading }: AdvancedEditorProps) {
  const scenario = useAppStore((s) => s.scenario) ?? {};
  const updateScenario = useAppStore((s) => s.updateScenario);

  const sortedDrivers = [...drivers]
    .filter((d) => d.finish_position != null)
    .sort((a, b) => (a.finish_position ?? 99) - (b.finish_position ?? 99));

  const driverOverrides = scenario.driver_overrides ?? {};
  const raceParams = scenario.race_param_overrides ?? {};
  const weatherOverrides = scenario.weather_overrides ?? [];
  const removedEvents = (scenario.event_overrides ?? [])
    .filter((o) => o.action === 'remove')
    .map((o) => o.event_id);

  function updateDriverOverride(driverId: string, field: 'pace_offset_seconds' | 'tyre_management_pct', value: number) {
    const existing = driverOverrides[driverId] ?? {};
    updateScenario({
      driver_overrides: {
        ...driverOverrides,
        [driverId]: { ...existing, [field]: value },
      },
    });
  }

  function updateRaceParam(field: 'pit_loss_seconds' | 'overtake_difficulty', value: number) {
    updateScenario({
      race_param_overrides: { ...raceParams, [field]: value },
    });
  }

  function updateTrackTempOffset(value: number) {
    // Store as a single weather override entry with track_temp_offset
    const existing = weatherOverrides.length > 0 ? { ...weatherOverrides[0] } : { lap_range: [1, _totalLaps] };
    updateScenario({
      weather_overrides: [{ ...existing, track_temp_offset_celsius: value }],
    });
  }

  function toggleEvent(eventId: string) {
    const current = scenario.event_overrides ?? [];
    const exists = current.find((o) => o.event_id === eventId && o.action === 'remove');
    if (exists) {
      updateScenario({
        event_overrides: current.filter((o) => o.event_id !== eventId),
      });
    } else {
      updateScenario({
        event_overrides: [...current, { event_id: eventId, action: 'remove' }],
      });
    }
  }

  const currentTempOffset =
    weatherOverrides.length > 0 && (weatherOverrides[0] as Record<string, unknown>).track_temp_offset_celsius != null
      ? (weatherOverrides[0] as Record<string, unknown>).track_temp_offset_celsius as number
      : 0;

  const currentPitLoss = raceParams.pit_loss_seconds ?? 20;
  const currentOvertakeDifficulty = raceParams.overtake_difficulty ?? 5;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {/* Driver Overrides */}
      <CollapsibleSection title="Driver Overrides" defaultOpen={true}>
        {sortedDrivers.map((driver) => {
          const override = driverOverrides[driver.driver_id] ?? {};
          const paceOffset = override.pace_offset_seconds ?? 0;
          const tyreMgmt = override.tyre_management_pct ?? 100;
          return (
            <div
              key={driver.driver_id}
              style={{
                padding: '8px',
                background: 'var(--bg-surface)',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: driver.team_color,
                    display: 'inline-block',
                  }}
                />
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 400 }}>
                  {driver.driver_id}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {driver.driver_name}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={labelStyle}>Pace Offset: {paceOffset > 0 ? '+' : ''}{paceOffset.toFixed(1)}s</div>
                  <input
                    type="range"
                    min={-2}
                    max={2}
                    step={0.1}
                    value={paceOffset}
                    onChange={(e) => updateDriverOverride(driver.driver_id, 'pace_offset_seconds', parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={labelStyle}>Tyre Mgmt: {tyreMgmt}%</div>
                  <input
                    type="range"
                    min={80}
                    max={120}
                    step={1}
                    value={tyreMgmt}
                    onChange={(e) => updateDriverOverride(driver.driver_id, 'tyre_management_pct', parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </CollapsibleSection>

      {/* Event Management */}
      <CollapsibleSection title="Event Management">
        {events.length === 0 && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No race events to manage.</div>
        )}
        {events
          .filter((e) => ['SAFETY_CAR', 'VSC', 'RED_FLAG'].includes(e.event_type))
          .map((event) => {
            const isActive = !removedEvents.includes(event.event_id);
            return (
              <div
                key={event.event_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '0.5px solid var(--bg-surface)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                    {event.event_type.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Laps {event.lap_start} - {event.lap_end}
                    {event.details ? ` | ${event.details}` : ''}
                  </span>
                </div>
                <div
                  onClick={() => toggleEvent(event.event_id)}
                  style={{
                    width: '34px',
                    height: '18px',
                    borderRadius: '9px',
                    background: isActive ? 'var(--accent)' : 'var(--border-subtle)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: 'var(--text-primary)',
                      position: 'absolute',
                      top: '2px',
                      left: '2px',
                      transition: 'transform 0.15s',
                      transform: isActive ? 'translateX(16px)' : 'translateX(0)',
                    }}
                  />
                </div>
              </div>
            );
          })}
      </CollapsibleSection>

      {/* Weather Overrides */}
      <CollapsibleSection title="Weather Overrides">
        <div>
          <div style={labelStyle}>Track Temperature Offset: {currentTempOffset > 0 ? '+' : ''}{currentTempOffset}°C</div>
          <input
            type="range"
            min={-15}
            max={15}
            step={1}
            value={currentTempOffset}
            onChange={(e) => updateTrackTempOffset(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>-15°C</span>
            <span>0</span>
            <span>+15°C</span>
          </div>
        </div>
      </CollapsibleSection>

      {/* Race Parameters */}
      <CollapsibleSection title="Race Parameters">
        <div>
          <div style={labelStyle}>Pit Loss: {currentPitLoss.toFixed(1)}s</div>
          <input
            type="range"
            min={15}
            max={35}
            step={0.5}
            value={currentPitLoss}
            onChange={(e) => updateRaceParam('pit_loss_seconds', parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>15s</span>
            <span>35s</span>
          </div>
        </div>
        <div>
          <div style={labelStyle}>Overtake Difficulty: {currentOvertakeDifficulty}/10</div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={currentOvertakeDifficulty}
            onChange={(e) => updateRaceParam('overtake_difficulty', parseInt(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>Easy</span>
            <span>Hard</span>
          </div>
        </div>
      </CollapsibleSection>

      {/* Run button */}
      <div style={{ paddingTop: '12px' }}>
        <Button onClick={onSimulate} disabled={loading}>
          {loading ? 'Simulating...' : 'Run Simulation'}
        </Button>
      </div>
    </div>
  );
}
