import { useAppStore } from '../store';
import { Button } from './common/Button';
import type { DriverEntry, RaceEvent } from '../types';

interface ScenarioEditorProps {
  drivers: DriverEntry[];
  events: RaceEvent[];
  totalLaps: number;
  raceId: string;
  onSimulate: () => void;
  loading: boolean;
}

const COMPOUNDS = ['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'];

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

export function ScenarioEditor({ drivers, events, totalLaps, raceId: _raceId, onSimulate, loading }: ScenarioEditorProps) {
  const scenario = useAppStore((s) => s.scenario) ?? {};
  const updateScenario = useAppStore((s) => s.updateScenario);

  const selectedDriverId = Object.keys(scenario.pit_overrides ?? {})[0] ?? '';

  const currentOverride = scenario.pit_overrides?.[selectedDriverId];
  const pit1Lap = currentOverride?.stops?.[0]?.lap ?? 1;
  const pit1Compound = currentOverride?.stops?.[0]?.compound_to ?? 'MEDIUM';
  const pit2Lap = currentOverride?.stops?.[1]?.lap ?? Math.floor(totalLaps / 2);
  const pit2Compound = currentOverride?.stops?.[1]?.compound_to ?? 'HARD';

  const removedEvents = (scenario.event_overrides ?? [])
    .filter((o) => o.action === 'remove')
    .map((o) => o.event_id);

  function selectDriver(driverId: string) {
    const driver = drivers.find((d) => d.driver_id === driverId);
    if (!driver) return;
    const defaultPit1 = driver.pit_stops[0]?.lap_number ?? Math.floor(totalLaps / 3);
    const defaultPit2 = driver.pit_stops[1]?.lap_number ?? Math.floor((totalLaps * 2) / 3);
    const defaultC1 = driver.pit_stops[0]?.tyre_to ?? 'MEDIUM';
    const defaultC2 = driver.pit_stops[1]?.tyre_to ?? 'HARD';
    updateScenario({
      pit_overrides: {
        [driverId]: {
          stops: [
            { lap: defaultPit1, compound_to: defaultC1 },
            { lap: defaultPit2, compound_to: defaultC2 },
          ],
        },
      },
    });
  }

  function updatePit(index: number, field: 'lap' | 'compound_to', value: number | string) {
    if (!selectedDriverId) return;
    const stops = [...(currentOverride?.stops ?? [
      { lap: 1, compound_to: 'MEDIUM' },
      { lap: Math.floor(totalLaps / 2), compound_to: 'HARD' },
    ])];
    if (field === 'lap') stops[index] = { ...stops[index], lap: value as number };
    else stops[index] = { ...stops[index], compound_to: value as string };
    updateScenario({
      pit_overrides: { [selectedDriverId]: { stops } },
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

  const sortedDrivers = [...drivers]
    .filter((d) => d.finish_position != null)
    .sort((a, b) => (a.finish_position ?? 99) - (b.finish_position ?? 99));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Driver selector */}
      <div>
        <div style={labelStyle}>Driver</div>
        <select
          style={inputStyle}
          value={selectedDriverId}
          onChange={(e) => selectDriver(e.target.value)}
        >
          <option value="">Select a driver...</option>
          {sortedDrivers.map((d) => (
            <option key={d.driver_id} value={d.driver_id}>
              {d.driver_id} - {d.driver_name}
            </option>
          ))}
        </select>
      </div>

      {selectedDriverId && (
        <>
          {/* Pit Stop 1 */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Pit 1 - Lap {pit1Lap}</div>
              <input
                type="range"
                min={1}
                max={Math.floor(totalLaps / 2)}
                value={pit1Lap}
                onChange={(e) => updatePit(0, 'lap', parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>
            <div style={{ width: '120px' }}>
              <select
                style={inputStyle}
                value={pit1Compound}
                onChange={(e) => updatePit(0, 'compound_to', e.target.value)}
              >
                {COMPOUNDS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pit Stop 2 */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Pit 2 - Lap {pit2Lap}</div>
              <input
                type="range"
                min={Math.floor(totalLaps / 3)}
                max={totalLaps - 1}
                value={pit2Lap}
                onChange={(e) => updatePit(1, 'lap', parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>
            <div style={{ width: '120px' }}>
              <select
                style={inputStyle}
                value={pit2Compound}
                onChange={(e) => updatePit(1, 'compound_to', e.target.value)}
              >
                {COMPOUNDS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      {/* Event toggles */}
      {events.length > 0 && (
        <div>
          <div style={labelStyle}>Race Events</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                    <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                      {event.event_type.replace('_', ' ')} (Lap {event.lap_start}-{event.lap_end})
                    </span>
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
          </div>
        </div>
      )}

      {/* Run button */}
      <Button onClick={onSimulate} disabled={loading}>
        {loading ? 'Simulating...' : 'Run Simulation'}
      </Button>
    </div>
  );
}
