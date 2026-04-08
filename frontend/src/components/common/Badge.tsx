const variantStyles: Record<string, React.CSSProperties> = {
  sc: {
    background: 'var(--warning-bg)',
    color: 'var(--warning)',
    border: '0.5px solid var(--warning-border)',
  },
  vsc: {
    background: 'var(--vsc-bg)',
    color: 'var(--vsc)',
    border: '0.5px solid var(--vsc-border)',
  },
  rain: {
    background: 'var(--info-bg)',
    color: 'var(--info)',
    border: '0.5px solid var(--info-border)',
  },
  red_flag: {
    background: 'var(--danger-bg)',
    color: 'var(--danger)',
    border: '0.5px solid var(--danger-border)',
  },
  confidence: {
    background: 'var(--accent-bg)',
    color: 'var(--accent)',
    border: '0.5px solid transparent',
  },
};

const baseStyle: React.CSSProperties = {
  borderRadius: '20px',
  padding: '3px 10px',
  fontSize: '11px',
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
  whiteSpace: 'nowrap',
};

interface BadgeProps {
  variant: 'sc' | 'vsc' | 'rain' | 'red_flag' | 'confidence';
  label: string;
}

export function Badge({ variant, label }: BadgeProps) {
  return (
    <span style={{ ...baseStyle, ...variantStyles[variant] }}>
      {label}
    </span>
  );
}
