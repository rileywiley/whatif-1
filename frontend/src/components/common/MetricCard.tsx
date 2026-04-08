interface MetricCardProps {
  label: string;
  value: string;
  note?: string;
}

const styles = {
  container: {
    background: 'var(--bg-surface)',
    borderRadius: '8px',
    padding: '12px 14px',
  } as React.CSSProperties,
  label: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginBottom: '3px',
    fontWeight: 400,
    letterSpacing: '1.5px',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  value: {
    fontSize: '20px',
    fontWeight: 300,
    color: 'var(--text-bright)',
  } as React.CSSProperties,
  note: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  } as React.CSSProperties,
};

export function MetricCard({ label, value, note }: MetricCardProps) {
  return (
    <div style={styles.container}>
      <div style={styles.label}>{label}</div>
      <div style={styles.value}>{value}</div>
      {note && <div style={styles.note}>{note}</div>}
    </div>
  );
}
