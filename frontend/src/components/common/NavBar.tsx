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
    fontWeight: 500,
    color: '#E8002D',
  } as React.CSSProperties,
  guideLink: {
    fontSize: '13px',
    fontWeight: 300,
    color: 'var(--text-secondary)',
    textDecoration: 'none',
  } as React.CSSProperties,
};

export function NavBar() {
  return (
    <nav style={styles.nav}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link to="/" style={styles.logo}>
          Whati<span style={styles.logoSuffix}>F-1</span>
        </Link>
        <Link to="/tutorial" style={styles.guideLink}>Guide</Link>
      </div>
    </nav>
  );
}
