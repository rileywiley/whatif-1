import { Link } from 'react-router-dom';

const styles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '0.5px solid var(--border-subtle)',
    background: 'var(--bg-base)',
  } as React.CSSProperties,
  logo: {
    fontSize: '28px',
    fontWeight: 300,
    letterSpacing: '-0.5px',
    color: 'var(--text-bright)',
    textDecoration: 'none',
  } as React.CSSProperties,
  logoSuffix: {
    fontWeight: 200,
    color: 'var(--text-muted)',
  } as React.CSSProperties,
};

export function NavBar() {
  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.logo}>
        WhatIf<span style={styles.logoSuffix}>-1</span>
      </Link>
    </nav>
  );
}
