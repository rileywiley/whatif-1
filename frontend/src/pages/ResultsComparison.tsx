import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { NavBar } from '../components/common/NavBar';
import { Card } from '../components/common/Card';
import { MetricCard } from '../components/common/MetricCard';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';

export function ResultsComparison() {
  const { raceId } = useParams<{ raceId: string }>();
  const navigate = useNavigate();
  const simResult = useAppStore((s) => s.simResult);
  const currentRace = useAppStore((s) => s.currentRace);
  const resetScenario = useAppStore((s) => s.resetScenario);

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
          No simulation results. Go back and run a simulation.
        </div>
      </div>
    );
  }

  const diffs = Object.entries(simResult.diff_summary);
  const sortedDiffs = diffs.sort(
    (a, b) => (a[1].simulated_position ?? 99) - (b[1].simulated_position ?? 99)
  );

  // Compute metrics
  const actualWinner = diffs.find(([, d]) => d.actual_position === 1)?.[1];
  const simWinner = diffs.find(([, d]) => d.simulated_position === 1)?.[1];
  const winnerChanged = actualWinner?.driver_name !== simWinner?.driver_name;

  const totalPositionsChanged = diffs.reduce(
    (sum, [, d]) => sum + Math.abs(d.position_delta ?? 0),
    0
  );

  const biggestSwing = diffs.reduce<{ name: string; delta: number }>(
    (best, [, d]) => {
      const absDelta = Math.abs(d.position_delta ?? 0);
      return absDelta > Math.abs(best.delta)
        ? { name: d.driver_name, delta: d.position_delta ?? 0 }
        : best;
    },
    { name: '', delta: 0 }
  );

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 300,
                letterSpacing: '-0.3px',
                color: 'var(--text-bright)',
                margin: 0,
              }}
            >
              Simulation Results
            </h1>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {currentRace.name} - {currentRace.year}
            </div>
          </div>
          <Badge
            variant="confidence"
            label={`${Math.round(simResult.confidence_score * 100)}% confidence`}
          />
        </div>

        {/* Metric cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <MetricCard
            label="Winner Changed"
            value={winnerChanged ? 'Yes' : 'No'}
            note={simWinner ? `${simWinner.driver_name} wins` : undefined}
          />
          <MetricCard
            label="Total Positions Changed"
            value={String(totalPositionsChanged)}
          />
          <MetricCard
            label="Biggest Swing"
            value={biggestSwing.delta > 0 ? `+${biggestSwing.delta}` : String(biggestSwing.delta)}
            note={biggestSwing.name}
          />
        </div>

        {/* Position diff table */}
        <Card style={{ marginBottom: '24px' }}>
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
            Position Comparison
          </div>

          {/* Table header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 60px 60px 60px',
              gap: '8px',
              padding: '8px 0',
              borderBottom: '0.5px solid var(--border-subtle)',
              fontSize: '11px',
              fontWeight: 400,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            <span>Pos</span>
            <span>Driver</span>
            <span style={{ textAlign: 'center' }}>Actual</span>
            <span style={{ textAlign: 'center' }}>Sim</span>
            <span style={{ textAlign: 'center' }}>Delta</span>
          </div>

          {/* Table rows */}
          {sortedDiffs.map(([driverId, diff], i) => {
            const delta = diff.position_delta ?? 0;
            return (
              <div
                key={driverId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 60px 60px 60px',
                  gap: '8px',
                  padding: '8px 0',
                  borderBottom:
                    i < sortedDiffs.length - 1
                      ? '0.5px solid var(--bg-surface)'
                      : 'none',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {diff.simulated_position ?? '-'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: diff.team_color || 'var(--text-muted)',
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {driverId}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {diff.driver_name}
                  </span>
                </div>
                <span
                  style={{
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {diff.actual_position ?? '-'}
                </span>
                <span
                  style={{
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {diff.simulated_position ?? '-'}
                </span>
                <span
                  style={{
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    fontWeight: 500,
                    color:
                      delta > 0
                        ? 'var(--accent)'
                        : delta < 0
                          ? 'var(--danger)'
                          : 'var(--text-muted)',
                  }}
                >
                  {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '-'}
                </span>
              </div>
            );
          })}
        </Card>

        {/* AI Narrative */}
        {simResult.narrative && (
          <div
            style={{
              background: 'var(--bg-surface)',
              borderLeft: '2px solid var(--accent)',
              borderRadius: '0',
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 300,
              color: 'var(--text-secondary)',
              lineHeight: '1.7',
              marginBottom: '24px',
            }}
          >
            {simResult.narrative}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            onClick={() => {
              resetScenario();
              navigate(`/race/${raceId}`);
            }}
          >
            Edit Scenario
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/race/${raceId}/replay`)}>
            Watch Replay
          </Button>
          <Button
            variant="accent"
            onClick={() => {
              if (simResult.scenario_id) {
                navigate(`/scenario/${simResult.scenario_id}`);
              }
            }}
          >
            Share
          </Button>
        </div>
      </div>
    </div>
  );
}
