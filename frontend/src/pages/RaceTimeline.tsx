import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRace } from '../hooks/useRace';
import { useAppStore } from '../store';
import { NavBar } from '../components/common/NavBar';
import { Card } from '../components/common/Card';
import { StrategyChart } from '../components/StrategyChart';
import { EventTimeline } from '../components/EventTimeline';
import { ScenarioEditor } from '../components/ScenarioEditor';
import { AdvancedEditor } from '../components/AdvancedEditor';
import { AIChat } from '../components/AIChat';

export function RaceTimeline() {
  const { raceId } = useParams<{ raceId: string }>();
  const navigate = useNavigate();
  const { data: race, isLoading } = useRace(raceId);
  const setCurrentRace = useAppStore((s) => s.setCurrentRace);
  const simResult = useAppStore((s) => s.simResult);
  const simLoading = useAppStore((s) => s.simLoading);
  const runSimulation = useAppStore((s) => s.runSimulation);
  const editorMode = useAppStore((s) => s.editorMode);
  const setEditorMode = useAppStore((s) => s.setEditorMode);

  useEffect(() => {
    if (race) setCurrentRace(race);
  }, [race, setCurrentRace]);

  useEffect(() => {
    if (simResult && raceId) {
      navigate(`/race/${raceId}/results`);
    }
  }, [simResult, raceId, navigate]);

  if (isLoading || !race) {
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
          Loading race data...
        </div>
      </div>
    );
  }

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 400,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: '4px',
            }}
          >
            Round {race.round_number} - {race.year}
          </div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 300,
              letterSpacing: '-0.3px',
              color: 'var(--text-bright)',
              margin: 0,
            }}
          >
            {race.name}
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {race.circuit.name} - {race.total_laps} laps
          </div>
        </div>

        {/* Strategy Chart */}
        <Card style={{ marginBottom: '12px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 400,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: '12px',
            }}
          >
            Strategy
          </div>
          <StrategyChart drivers={race.drivers} totalLaps={race.total_laps} />
        </Card>

        {/* Event Timeline */}
        <Card style={{ marginBottom: '24px' }}>
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
            Race Events
          </div>
          <EventTimeline
            events={race.events}
            rainLaps={race.weather_summary?.rain_laps ?? []}
            totalLaps={race.total_laps}
          />
        </Card>

        {/* Scenario Editor */}
        <Card style={{ marginBottom: '24px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 400,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}
            >
              Scenario Editor
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['simple', 'advanced'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setEditorMode(mode)}
                  style={{
                    background: editorMode === mode ? 'var(--text-primary)' : 'transparent',
                    color: editorMode === mode ? 'var(--bg-base)' : 'var(--text-secondary)',
                    border: editorMode === mode ? 'none' : '0.5px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '3px 10px',
                    fontSize: '11px',
                    fontWeight: 400,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          {editorMode === 'simple' ? (
            <ScenarioEditor
              drivers={race.drivers}
              events={race.events}
              totalLaps={race.total_laps}
              raceId={raceId!}
              onSimulate={() => runSimulation(raceId!)}
              loading={simLoading}
            />
          ) : (
            <AdvancedEditor
              drivers={race.drivers}
              events={race.events}
              totalLaps={race.total_laps}
              raceId={raceId!}
              onSimulate={() => runSimulation(raceId!)}
              loading={simLoading}
            />
          )}
        </Card>

        {/* AI Chat */}
        <Card>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 400,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: '12px',
            }}
          >
            Ask AI
          </div>
          <AIChat raceId={raceId!} />
        </Card>
      </div>
    </div>
  );
}
