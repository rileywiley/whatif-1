interface DriverSummary {
  driver_id: string;
  driver_name: string;
  team_color: string;
}

interface ShareCardProps {
  raceName: string;
  year: number;
  question: string;
  actualTop3: DriverSummary[];
  simulatedTop3: DriverSummary[];
  insight: string;
}

export function ShareCard({
  raceName,
  year,
  question,
  actualTop3,
  simulatedTop3,
  insight,
}: ShareCardProps) {
  return (
    <div
      style={{
        width: '600px',
        height: '400px',
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border-subtle)',
        borderRadius: '12px',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div>
        <div
          style={{
            fontSize: '28px',
            fontWeight: 300,
            letterSpacing: '-0.5px',
            color: 'var(--text-bright)',
            marginBottom: '4px',
          }}
        >
          WhatIf<span style={{ fontWeight: 200, color: 'var(--text-muted)' }}>-1</span>
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            marginBottom: '16px',
          }}
        >
          {year} {raceName}
        </div>
        <div
          style={{
            fontSize: '16px',
            fontWeight: 400,
            color: 'var(--text-primary)',
            lineHeight: '1.5',
          }}
        >
          {question}
        </div>
      </div>

      {/* Comparison */}
      <div style={{ display: 'flex', gap: '32px' }}>
        <div style={{ flex: 1 }}>
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
            Actual
          </div>
          {actualTop3.map((d, i) => (
            <div
              key={d.driver_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '16px' }}>
                {i + 1}
              </span>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: d.team_color,
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                {d.driver_id}
              </span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }}>
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
            Simulated
          </div>
          {simulatedTop3.map((d, i) => (
            <div
              key={d.driver_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '16px' }}>
                {i + 1}
              </span>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: d.team_color,
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                {d.driver_id}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Insight */}
      <div
        style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          fontWeight: 300,
          lineHeight: '1.5',
        }}
      >
        {insight}
      </div>
    </div>
  );
}
