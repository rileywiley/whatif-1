import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { NavBar } from '../components/common/NavBar';
import { ShareCard } from '../components/ShareCard';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import type { DiffEntry } from '../types';

export function ShareView() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['scenario', scenarioId],
    queryFn: () => api.fetchScenario(scenarioId!),
    enabled: !!scenarioId,
  });

  if (isLoading || !data) {
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
          Loading scenario...
        </div>
      </div>
    );
  }

  const { race, scenario, result } = data;

  // Extract top 3 for share card
  const getTop3 = (order: string[]) =>
    order.slice(0, 3).map((driverId) => {
      const driver = race.drivers.find((d) => d.driver_id === driverId);
      return {
        driver_id: driverId,
        driver_name: driver?.driver_name ?? driverId,
        team_color: driver?.team_color ?? 'var(--text-muted)',
      };
    });

  const actualOrder = [...race.drivers]
    .filter((d) => d.finish_position != null)
    .sort((a, b) => (a.finish_position ?? 99) - (b.finish_position ?? 99))
    .map((d) => d.driver_id);

  const actualTop3 = getTop3(actualOrder);
  const simulatedTop3 = getTop3(result.finish_order);

  const diffs = Object.entries(result.diff_summary) as [string, DiffEntry][];
  const sortedDiffs = diffs.sort(
    (a, b) => (a[1].simulated_position ?? 99) - (b[1].simulated_position ?? 99)
  );

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
        {/* Share card */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <ShareCard
            raceName={race.name}
            year={race.year}
            question={scenario.description ?? 'What if...?'}
            actualTop3={actualTop3}
            simulatedTop3={simulatedTop3}
            insight={result.narrative?.slice(0, 120) ?? 'See the full results below.'}
          />
        </div>

        {/* Results */}
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
              Full Results
            </div>
            <Badge
              variant="confidence"
              label={`${Math.round(result.confidence_score * 100)}% confidence`}
            />
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

          {sortedDiffs.map(([driverId, d], i) => {
            const delta = d.position_delta ?? 0;
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
                  {d.simulated_position ?? '-'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: d.team_color || 'var(--text-muted)',
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
                    {d.driver_name}
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
                  {d.actual_position ?? '-'}
                </span>
                <span
                  style={{
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {d.simulated_position ?? '-'}
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

        {/* Narrative */}
        {result.narrative && (
          <div
            style={{
              background: 'var(--bg-surface)',
              borderLeft: '2px solid var(--accent)',
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 300,
              color: 'var(--text-secondary)',
              lineHeight: '1.7',
              marginBottom: '24px',
            }}
          >
            {result.narrative}
          </div>
        )}

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <Button
            variant="accent"
            onClick={() => navigate(`/race/${race.race_id}`)}
          >
            Try your own what-if
          </Button>
        </div>
      </div>
    </div>
  );
}
