interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '0.5px solid var(--border-subtle)',
  borderRadius: '10px',
  padding: '14px 16px',
  transition: 'border-color 0.15s',
  cursor: 'default',
};

export function Card({ children, style, onClick }: CardProps) {
  return (
    <div
      style={{ ...cardStyle, ...(onClick ? { cursor: 'pointer' } : {}), ...style }}
      onClick={onClick}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-emphasis)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-subtle)';
      }}
    >
      {children}
    </div>
  );
}
