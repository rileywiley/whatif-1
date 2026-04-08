interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'accent';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}

const base: React.CSSProperties = {
  borderRadius: '6px',
  padding: '8px 18px',
  fontSize: '13px',
  fontWeight: 400,
  cursor: 'pointer',
  border: 'none',
  transition: 'background 0.15s',
  fontFamily: 'var(--font-sans)',
};

const variants: Record<string, React.CSSProperties> = {
  primary: {
    background: 'var(--text-primary)',
    color: 'var(--bg-base)',
  },
  secondary: {
    background: 'transparent',
    border: '0.5px solid var(--border-subtle)',
    color: 'var(--text-tertiary)',
  },
  accent: {
    background: 'var(--accent)',
    color: 'var(--accent-text)',
  },
};

export function Button({ variant = 'primary', children, onClick, disabled, style }: ButtonProps) {
  return (
    <button
      style={{
        ...base,
        ...variants[variant],
        ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
        ...style,
      }}
      onClick={onClick}
      disabled={disabled}
      onMouseDown={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
      }}
    >
      {children}
    </button>
  );
}
