import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { NavBar } from '../components/common/NavBar';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { PositionTower } from '../components/PositionTower';
import type { DriverReplayState } from '../types';

const COMPOUND_COLORS: Record<string, string> = {
  SOFT: '#E24B4A',
  MEDIUM: '#EF9F27',
  HARD: '#8A8A8E',
  INTERMEDIATE: '#5DCAA5',
  WET: '#3B8BD4',
};

export function LapReplay() {
  const { raceId } = useParams<{ raceId: string }>();
  const navigate = useNavigate();
  const simResult = useAppStore((s) => s.simResult);
  const currentRace = useAppStore((s) => s.currentRace);
  const replayLap = useAppStore((s) => s.replayLap);
  const replayPlaying = useAppStore((s) => s.replayPlaying);
  const replaySpeed = useAppStore((s) => s.replaySpeed);
  const setReplayLap = useAppStore((s) => s.setReplayLap);
  const toggleReplayPlay = useAppStore((s) => s.toggleReplayPlay);
  const setReplaySpeed = useAppStore((s) => s.setReplaySpeed);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalLaps = currentRace?.total_laps ?? 58;

  // Playback timer
  useEffect(() => {
    if (replayPlaying) {
      intervalRef.current = setInterval(
        () => {
          const store = useAppStore.getState();
          const nextLap = store.replayLap + 1;
          if (nextLap > totalLaps) {
            store.toggleReplayPlay();
          } else {
            store.setReplayLap(nextLap);
          }
        },
        1000 / replaySpeed
      );
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [replayPlaying, replaySpeed, totalLaps]);

  if (!simResult || !currentRace) {
    return (
      <div>
        <NavBar />
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
          No simulation data available for replay.
          <div style={{ marginTop: 12 }}>
            <Button variant="secondary" onClick={() => navigate(`/race/${raceId}`)}>Back to Race</Button>
          </div>
        </div>
      </div>
    );
  }

  // Build effective event timeline: actual events + injected - removed
  const scenario = useAppStore.getState().scenario ?? {};
  const eventOverrides = scenario.event_overrides ?? [];
  const removedIds = new Set(eventOverrides.filter((o) => o.action === 'remove').map((o) => o.event_id));
  const injected = eventOverrides
    .filter((o) => o.action === 'ADD')
    .map((o, i) => ({
      event_id: `injected-${i}`,
      event_type: o.event_type ?? 'SAFETY_CAR',
      lap_start: o.lap_start ?? 1,
      lap_end: o.lap_end ?? 1,
      trigger_driver_id: null,
      details: 'Injected event',
    }));
  const effectiveEvents = [
    ...currentRace.events.filter((e) => !removedIds.has(e.event_id)),
    ...injected,
  ];

  // Determine race status for current lap
  const activeEvent = effectiveEvents.find(
    (e) => e.lap_start <= replayLap && e.lap_end >= replayLap &&
      (e.event_type === 'SAFETY_CAR' || e.event_type === 'VSC' || e.event_type === 'RED_FLAG')
  );

  const statusLabel = activeEvent
    ? activeEvent.event_type === 'SAFETY_CAR' ? 'SAFETY CAR'
      : activeEvent.event_type === 'VSC' ? 'VIRTUAL SAFETY CAR'
      : 'RED FLAG'
    : 'GREEN FLAG';

  const statusColor = activeEvent
    ? activeEvent.event_type === 'SAFETY_CAR' ? 'var(--warning)'
      : activeEvent.event_type === 'VSC' ? 'var(--vsc)'
      : 'var(--danger)'
    : 'var(--success)';

  const statusBg = activeEvent
    ? activeEvent.event_type === 'SAFETY_CAR' ? 'var(--warning-bg)'
      : activeEvent.event_type === 'VSC' ? 'var(--vsc-bg)'
      : 'var(--danger-bg)'
    : '#141E0C';

  // Find drivers pitting this lap
  const pittingDrivers: string[] = [];
  for (const driverId of simResult.finish_order) {
    const laps = simResult.simulated_laps[driverId];
    if (!laps) continue;
    const thisLap = laps.find((l) => l.lap_number === replayLap);
    const prevLap = laps.find((l) => l.lap_number === replayLap - 1);
    if (thisLap && prevLap && thisLap.tyre_compound !== prevLap.tyre_compound) {
      pittingDrivers.push(driverId);
    }
  }

  // Build driver replay states for the current lap
  const driverStates: DriverReplayState[] = simResult.finish_order
    .map((driverId) => {
      const laps = simResult.simulated_laps[driverId];
      const lapData = laps?.find((l) => l.lap_number === replayLap);
      const driver = currentRace.drivers.find((d) => d.driver_id === driverId);
      if (!lapData || !driver) return null;

      const isPitting = pittingDrivers.includes(driverId);

      return {
        driver_id: driverId,
        driver_name: driver.driver_name,
        team_color: driver.team_color,
        position: lapData.position,
        lap_time: lapData.lap_time,
        gap_to_leader: lapData.gap_to_leader,
        tyre_compound: lapData.tyre_compound,
        tyre_age: lapData.tyre_age,
        actual_position: driver.finish_position ?? 20,
        pace_relative: lapData.lap_time > 0 ? Math.min(1, 80 / lapData.lap_time) : 0.5,
        is_pitting: isPitting,
      };
    })
    .filter((d): d is DriverReplayState => d !== null);

  // Find fastest driver this lap
  const fastestDriver = [...driverStates].sort((a, b) => a.lap_time - b.lap_time)[0];

  const speeds: (1 | 5 | 10)[] = [1, 5, 10];

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
        {/* Header with back button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 300, letterSpacing: '-0.3px', color: 'var(--text-bright)', margin: 0 }}>
              Lap Replay
            </h1>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {currentRace.name} - Simulated
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={() => navigate(`/race/${raceId}/results`)}>Results</Button>
            <Button variant="secondary" onClick={() => navigate(`/race/${raceId}`)}>Edit Scenario</Button>
          </div>
        </div>

        {/* Race status banner */}
        <div
          style={{
            background: statusBg,
            border: `0.5px solid ${statusColor}33`,
            borderRadius: '6px',
            padding: '8px 16px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor }} />
            <span style={{ fontSize: '13px', fontWeight: 500, color: statusColor, letterSpacing: '0.5px' }}>
              {statusLabel}
            </span>
            {activeEvent && (
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Laps {activeEvent.lap_start}-{activeEvent.lap_end}
              </span>
            )}
          </div>
          {/* Pit stop alerts */}
          {pittingDrivers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                PIT
              </span>
              {pittingDrivers.map((d) => (
                <span key={d} style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Playback controls */}
        <Card style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={toggleReplayPlay}
              style={{
                background: 'var(--text-primary)', color: 'var(--bg-base)', border: 'none',
                borderRadius: '6px', padding: '8px 18px', fontSize: '13px', fontWeight: 400,
                cursor: 'pointer', fontFamily: 'var(--font-sans)', minWidth: '70px',
              }}
            >
              {replayPlaying ? 'Pause' : 'Play'}
            </button>

            <div style={{ flex: 1 }}>
              <input
                type="range" min={1} max={totalLaps} value={replayLap}
                onChange={(e) => setReplayLap(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-bright)', whiteSpace: 'nowrap' }}>
              Lap {replayLap} / {totalLaps}
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              {speeds.map((s) => (
                <button
                  key={s}
                  onClick={() => setReplaySpeed(s)}
                  style={{
                    background: replaySpeed === s ? 'var(--text-primary)' : 'transparent',
                    color: replaySpeed === s ? 'var(--bg-base)' : 'var(--text-secondary)',
                    border: replaySpeed === s ? 'none' : '0.5px solid var(--border-subtle)',
                    borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 400,
                    cursor: 'pointer', fontFamily: 'var(--font-mono)',
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Compound legend */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', paddingLeft: '4px' }}>
          {Object.entries(COMPOUND_COLORS).map(([name, color]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{name}</span>
            </div>
          ))}
        </div>

        {/* Position Tower */}
        <Card style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 400, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Live Timing
            </span>
            {fastestDriver && (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Fastest: <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{fastestDriver.driver_id}</span>
              </span>
            )}
          </div>
          <PositionTower drivers={driverStates} currentLap={replayLap} showActualDelta />
        </Card>

        {/* Commentary */}
        <div
          style={{
            background: 'var(--bg-surface)',
            borderLeft: '2px solid var(--accent)',
            padding: '12px 16px',
            fontSize: '13px',
            fontWeight: 300,
            color: 'var(--text-secondary)',
            lineHeight: '1.7',
          }}
        >
          {pittingDrivers.length > 0
            ? `${pittingDrivers.join(', ')} ${pittingDrivers.length > 1 ? 'are' : 'is'} pitting this lap. `
            : ''}
          {activeEvent
            ? `${statusLabel} deployed (Laps ${activeEvent.lap_start}-${activeEvent.lap_end}). The field is neutralized. `
            : ''}
          {fastestDriver
            ? `${fastestDriver.driver_id} sets the fastest lap at ${fastestDriver.lap_time.toFixed(3)}s.`
            : ''}
        </div>
      </div>
    </div>
  );
}
