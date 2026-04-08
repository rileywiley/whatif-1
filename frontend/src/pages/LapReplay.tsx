import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { NavBar } from '../components/common/NavBar';
import { Card } from '../components/common/Card';
import { PositionTower } from '../components/PositionTower';
import type { DriverReplayState } from '../types';

export function LapReplay() {
  const { raceId: _raceId } = useParams<{ raceId: string }>();
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
        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            padding: '24px',
            color: 'var(--text-muted)',
            fontSize: '13px',
          }}
        >
          No simulation data available for replay.
        </div>
      </div>
    );
  }

  // Build driver replay states for the current lap
  const driverStates: DriverReplayState[] = simResult.finish_order
    .map((driverId) => {
      const laps = simResult.simulated_laps[driverId];
      const lapData = laps?.find((l) => l.lap_number === replayLap);
      const driver = currentRace.drivers.find((d) => d.driver_id === driverId);
      if (!lapData || !driver) return null;
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
      };
    })
    .filter((d): d is DriverReplayState => d !== null);

  const speeds: (1 | 5 | 10)[] = [1, 5, 10];

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 300,
              letterSpacing: '-0.3px',
              color: 'var(--text-bright)',
              margin: 0,
            }}
          >
            Lap Replay
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {currentRace.name} - Simulated
          </div>
        </div>

        {/* Playback controls */}
        <Card style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            {/* Play/Pause */}
            <button
              onClick={toggleReplayPlay}
              style={{
                background: 'var(--text-primary)',
                color: 'var(--bg-base)',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 400,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {replayPlaying ? 'Pause' : 'Play'}
            </button>

            {/* Lap slider */}
            <div style={{ flex: 1 }}>
              <input
                type="range"
                min={1}
                max={totalLaps}
                value={replayLap}
                onChange={(e) => setReplayLap(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>

            {/* Lap counter */}
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '14px',
                color: 'var(--text-bright)',
                whiteSpace: 'nowrap',
              }}
            >
              Lap {replayLap} / {totalLaps}
            </div>

            {/* Speed selector */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {speeds.map((s) => (
                <button
                  key={s}
                  onClick={() => setReplaySpeed(s)}
                  style={{
                    background: replaySpeed === s ? 'var(--text-primary)' : 'transparent',
                    color: replaySpeed === s ? 'var(--bg-base)' : 'var(--text-secondary)',
                    border:
                      replaySpeed === s ? 'none' : '0.5px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 400,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Position Tower */}
        <Card style={{ marginBottom: '16px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 400,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: '8px',
            }}
          >
            Positions
          </div>
          <PositionTower drivers={driverStates} currentLap={replayLap} showActualDelta />
        </Card>

        {/* Commentary placeholder */}
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
          Commentary for lap {replayLap} will appear here.
        </div>
      </div>
    </div>
  );
}
