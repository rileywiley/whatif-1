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
const EVENT_TYPES = ['SAFETY_CAR', 'VSC', 'RED_FLAG'];
const EVENT_LABELS: Record<string, string> = { SAFETY_CAR: 'Safety Car', VSC: 'Virtual Safety Car', RED_FLAG: 'Red Flag' };
const EVENT_COLORS: Record<string, string> = { SAFETY_CAR: 'var(--warning)', VSC: 'var(--vsc)', RED_FLAG: 'var(--danger)' };

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

  const eventOverrides = scenario.event_overrides ?? [];
  const removedEvents = eventOverrides.filter((o) => o.action === 'remove').map((o) => o.event_id);
  const injectedEvents = eventOverrides.filter((o) => o.action === 'ADD');

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
      updateScenario({ event_overrides: current.filter((o) => o.event_id !== eventId) });
    } else {
      updateScenario({ event_overrides: [...current, { event_id: eventId, action: 'remove' }] });
    }
  }

  function addInjectedEvent() {
    const current = scenario.event_overrides ?? [];
    updateScenario({
      event_overrides: [
        ...current,
        { action: 'ADD', event_type: 'SAFETY_CAR', lap_start: 10, lap_end: 14 },
      ],
    });
  }

  function updateInjectedEvent(index: number, field: string, value: string | number) {
    const current = [...(scenario.event_overrides ?? [])];
    // Find the nth ADD event
    let addCount = 0;
    for (let i = 0; i < current.length; i++) {
      if (current[i].action === 'ADD') {
        if (addCount === index) {
          current[i] = { ...current[i], [field]: value };
          break;
        }
        addCount++;
      }
    }
    updateScenario({ event_overrides: current });
  }

  function removeInjectedEvent(index: number) {
    const current = [...(scenario.event_overrides ?? [])];
    let addCount = 0;
    for (let i = 0; i < current.length; i++) {
      if (current[i].action === 'ADD') {
        if (addCount === index) {
          current.splice(i, 1);
          break;
        }
        addCount++;
      }
    }
    updateScenario({ event_overrides: current });
  }

  const sortedDrivers = [...drivers]
    .filter((d) => d.finish_position != null)
    .sort((a, b) => (a.finish_position ?? 99) - (b.finish_position ?? 99));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Driver selector */}
      <div>
        <div style={labelStyle}>Driver</div>
        <select style={inputStyle} value={selectedDriverId} onChange={(e) => selectDriver(e.target.value)}>
          <option value="">Select a driver...</option>
          {sortedDrivers.map((d) => (
            <option key={d.driver_id} value={d.driver_id}>{d.driver_id} - {d.driver_name}</option>
          ))}
        </select>
      </div>

      {selectedDriverId && (
        <>
          {/* Pit Stop 1 */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Pit 1 - Lap {pit1Lap}</div>
              <input type="range" min={1} max={Math.floor(totalLaps / 2)} value={pit1Lap}
                onChange={(e) => updatePit(0, 'lap', parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }} />
            </div>
            <div style={{ width: '120px' }}>
              <select style={inputStyle} value={pit1Compound} onChange={(e) => updatePit(0, 'compound_to', e.target.value)}>
                {COMPOUNDS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Pit Stop 2 */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Pit 2 - Lap {pit2Lap}</div>
              <input type="range" min={Math.floor(totalLaps / 3)} max={totalLaps - 1} value={pit2Lap}
                onChange={(e) => updatePit(1, 'lap', parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }} />
            </div>
            <div style={{ width: '120px' }}>
              <select style={inputStyle} value={pit2Compound} onChange={(e) => updatePit(1, 'compound_to', e.target.value)}>
                {COMPOUNDS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </>
      )}

      {/* Existing event toggles */}
      {events.filter((e) => EVENT_TYPES.includes(e.event_type)).length > 0 && (
        <div>
          <div style={labelStyle}>Existing Race Events</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {events
              .filter((e) => EVENT_TYPES.includes(e.event_type))
              .map((event) => {
                const isActive = !removedEvents.includes(event.event_id);
                return (
                  <div key={event.event_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid var(--bg-surface)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: EVENT_COLORS[event.event_type] ?? 'var(--text-muted)' }} />
                      <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                        {EVENT_LABELS[event.event_type] ?? event.event_type} (Lap {event.lap_start}-{event.lap_end})
                      </span>
                    </div>
                    <div onClick={() => toggleEvent(event.event_id)}
                      style={{ width: '34px', height: '18px', borderRadius: '9px', background: isActive ? 'var(--accent)' : 'var(--border-subtle)', position: 'relative', cursor: 'pointer', transition: 'background 0.15s' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--text-primary)', position: 'absolute', top: '2px', left: '2px', transition: 'transform 0.15s', transform: isActive ? 'translateX(16px)' : 'translateX(0)' }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Inject new events */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={labelStyle}>Inject Events</div>
          <button onClick={addInjectedEvent} style={{
            background: 'transparent', border: '0.5px solid var(--border-subtle)', borderRadius: '6px',
            padding: '4px 12px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontWeight: 300, transition: 'border-color 0.15s',
          }}>
            + Add Event
          </button>
        </div>

        {injectedEvents.length === 0 && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '4px 0' }}>
            No injected events. Click "+ Add Event" to simulate a safety car, VSC, or red flag.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {injectedEvents.map((ev, idx) => (
            <div key={idx} style={{ background: 'var(--bg-surface)', borderRadius: '6px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: EVENT_COLORS[ev.event_type ?? 'SAFETY_CAR'] }} />
                  <span style={{ fontSize: '12px', fontWeight: 500, color: EVENT_COLORS[ev.event_type ?? 'SAFETY_CAR'] }}>
                    Injected Event {idx + 1}
                  </span>
                </div>
                <button onClick={() => removeInjectedEvent(idx)} style={{
                  background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: '12px',
                  cursor: 'pointer', padding: '2px 6px', fontFamily: 'var(--font-sans)',
                }}>
                  Remove
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ ...labelStyle, fontSize: '10px' }}>Type</div>
                  <select style={inputStyle} value={ev.event_type ?? 'SAFETY_CAR'}
                    onChange={(e) => updateInjectedEvent(idx, 'event_type', e.target.value)}>
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{EVENT_LABELS[t]}</option>)}
                  </select>
                </div>
                <div style={{ width: '80px' }}>
                  <div style={{ ...labelStyle, fontSize: '10px' }}>Start Lap</div>
                  <input type="number" min={1} max={totalLaps} value={ev.lap_start ?? 10}
                    onChange={(e) => updateInjectedEvent(idx, 'lap_start', parseInt(e.target.value) || 1)}
                    style={inputStyle} />
                </div>
                <div style={{ width: '80px' }}>
                  <div style={{ ...labelStyle, fontSize: '10px' }}>End Lap</div>
                  <input type="number" min={1} max={totalLaps} value={ev.lap_end ?? 14}
                    onChange={(e) => updateInjectedEvent(idx, 'lap_end', parseInt(e.target.value) || 1)}
                    style={inputStyle} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Run button */}
      <Button onClick={onSimulate} disabled={loading}>
        {loading ? 'Simulating...' : 'Run Simulation'}
      </Button>
    </div>
  );
}
