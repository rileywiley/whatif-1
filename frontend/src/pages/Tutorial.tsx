import { Link } from 'react-router-dom';
import { NavBar } from '../components/common/NavBar';

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-base)',
  } as React.CSSProperties,
  container: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '48px 24px 80px',
  } as React.CSSProperties,
  heroTitle: {
    fontSize: 32,
    fontWeight: 300,
    color: 'var(--text-bright)',
    marginBottom: 8,
    letterSpacing: '-0.5px',
  } as React.CSSProperties,
  heroSubtitle: {
    fontSize: 14,
    fontWeight: 300,
    color: 'var(--text-secondary)',
    lineHeight: 1.7,
    marginBottom: 48,
  } as React.CSSProperties,
  section: {
    marginBottom: 48,
  } as React.CSSProperties,
  sectionNumber: {
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--accent)',
    textTransform: 'uppercase' as const,
    letterSpacing: '1.5px',
    marginBottom: 8,
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 24,
    fontWeight: 300,
    color: 'var(--text-bright)',
    marginBottom: 16,
  } as React.CSSProperties,
  body: {
    fontSize: 14,
    fontWeight: 300,
    color: 'var(--text-secondary)',
    lineHeight: 1.7,
    marginBottom: 12,
  } as React.CSSProperties,
  tip: {
    background: 'var(--accent-bg)',
    borderLeft: '3px solid var(--accent)',
    padding: '12px 16px',
    borderRadius: '0 6px 6px 0',
    marginBottom: 16,
    fontSize: 13,
    fontWeight: 300,
    color: 'var(--text-tertiary)',
    lineHeight: 1.6,
  } as React.CSSProperties,
  tipLabel: {
    fontWeight: 500,
    color: 'var(--accent)',
    marginRight: 6,
  } as React.CSSProperties,
  infoBox: {
    background: 'var(--info-bg)',
    borderLeft: '3px solid var(--info)',
    padding: '12px 16px',
    borderRadius: '0 6px 6px 0',
    marginBottom: 16,
    fontSize: 13,
    fontWeight: 300,
    color: 'var(--text-tertiary)',
    lineHeight: 1.6,
  } as React.CSSProperties,
  infoLabel: {
    fontWeight: 500,
    color: 'var(--info)',
    marginRight: 6,
  } as React.CSSProperties,
  list: {
    paddingLeft: 20,
    marginBottom: 16,
    fontSize: 14,
    fontWeight: 300,
    color: 'var(--text-secondary)',
    lineHeight: 2,
  } as React.CSSProperties,
  dot: {
    display: 'inline-block',
    width: 10,
    height: 10,
    borderRadius: '50%',
    marginRight: 4,
    verticalAlign: 'middle',
    position: 'relative' as const,
    top: -1,
  } as React.CSSProperties,
  badge: {
    display: 'inline-block',
    padding: '1px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 500,
    marginRight: 4,
    verticalAlign: 'middle',
  } as React.CSSProperties,
  kbd: {
    display: 'inline-block',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 4,
    padding: '1px 6px',
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-tertiary)',
  } as React.CSSProperties,
  divider: {
    border: 'none',
    borderTop: '0.5px solid var(--border-subtle)',
    margin: '48px 0',
  } as React.CSSProperties,
  ctaContainer: {
    textAlign: 'center' as const,
    marginTop: 56,
  } as React.CSSProperties,
  ctaButton: {
    display: 'inline-block',
    background: 'var(--accent)',
    color: 'var(--accent-text)',
    fontSize: 14,
    fontWeight: 500,
    padding: '12px 32px',
    borderRadius: 8,
    textDecoration: 'none',
    letterSpacing: '0.3px',
  } as React.CSSProperties,
  compoundRow: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap' as const,
    marginBottom: 16,
  } as React.CSSProperties,
  compoundItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: 'var(--text-secondary)',
    fontWeight: 300,
  } as React.CSSProperties,
  eventBadgeRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap' as const,
    marginBottom: 16,
  } as React.CSSProperties,
  logoSuffix: {
    fontWeight: 500,
    color: '#E8002D',
  } as React.CSSProperties,
};

function Dot({ color }: { color: string }) {
  return <span style={{ ...styles.dot, background: color }} />;
}

function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return <span style={{ ...styles.badge, background: bg, color }}>{label}</span>;
}

export function Tutorial() {
  return (
    <div style={styles.page}>
      <NavBar />
      <div style={styles.container}>

        {/* Hero */}
        <h1 style={styles.heroTitle}>How to use Whati<span style={styles.logoSuffix}>F-1</span></h1>
        <p style={styles.heroSubtitle}>
          Everything you need to know to rewrite Formula 1 history, from selecting a race
          to sharing your alternate timeline.
        </p>

        {/* Section 1: Welcome */}
        <div style={styles.section}>
          <div style={styles.sectionNumber}>01</div>
          <h2 style={styles.sectionTitle}>Welcome</h2>
          <p style={styles.body}>
            WhatIf-1 lets you rewrite Formula 1 history. Change pit strategies, inject
            safety cars, alter weather — then watch a lap-by-lap simulation of what could
            have happened.
          </p>
          <p style={styles.body}>
            The name is a play on words: <strong style={{ fontWeight: 500, color: 'var(--text-bright)' }}>
            Whati<span style={styles.logoSuffix}>F-1</span></strong> — "What if" meets "F1."
            Every race has a story. This tool lets you write a different one.
          </p>
          <div style={styles.tip}>
            <span style={styles.tipLabel}>Tip</span>
            Start with a race you remember well. You will have better intuition for
            whether your scenario changes make sense.
          </div>
        </div>

        <hr style={styles.divider} />

        {/* Section 2: Selecting a Race */}
        <div style={styles.section}>
          <div style={styles.sectionNumber}>02</div>
          <h2 style={styles.sectionTitle}>Selecting a Race</h2>
          <p style={styles.body}>
            The homepage shows every available race from the 2025 and 2026 seasons.
            Use the season pills at the top to filter by year, or use the search bar
            to find a race by name, circuit, or country.
          </p>
          <p style={styles.body}>
            Each race card shows the winner and disruption badges that tell you at a
            glance what happened during that event:
          </p>
          <div style={styles.eventBadgeRow}>
            <Badge label="SC" bg="var(--warning-bg)" color="var(--warning)" />
            <Badge label="VSC" bg="var(--vsc-bg)" color="var(--vsc)" />
            <Badge label="Rain" bg="var(--info-bg)" color="var(--info)" />
            <Badge label="Red Flag" bg="var(--danger-bg)" color="var(--danger)" />
          </div>
          <p style={styles.body}>
            Races with more disruptions tend to produce the most interesting "what if"
            scenarios. Click any race card to continue.
          </p>
        </div>

        <hr style={styles.divider} />

        {/* Section 3: Race Timeline */}
        <div style={styles.section}>
          <div style={styles.sectionNumber}>03</div>
          <h2 style={styles.sectionTitle}>Race Timeline</h2>
          <p style={styles.body}>
            The timeline page shows you what actually happened in the race before you
            start making changes. Two key visualizations:
          </p>
          <p style={styles.body}>
            <strong style={{ fontWeight: 500, color: 'var(--text-tertiary)' }}>Strategy chart</strong> — horizontal
            bars for each driver showing their tyre stints. Compound colors:
          </p>
          <div style={styles.compoundRow}>
            <span style={styles.compoundItem}><Dot color="var(--tyre-soft)" /> Soft</span>
            <span style={styles.compoundItem}><Dot color="var(--tyre-medium)" /> Medium</span>
            <span style={styles.compoundItem}><Dot color="var(--tyre-hard)" /> Hard</span>
            <span style={styles.compoundItem}><Dot color="var(--tyre-inter)" /> Intermediate</span>
            <span style={styles.compoundItem}><Dot color="var(--tyre-wet)" /> Wet</span>
          </div>
          <p style={styles.body}>
            <strong style={{ fontWeight: 500, color: 'var(--text-tertiary)' }}>Event timeline</strong> — colored
            blocks below the chart showing when safety cars{' '}
            <Badge label="SC" bg="var(--warning-bg)" color="var(--warning)" />, virtual safety cars{' '}
            <Badge label="VSC" bg="var(--vsc-bg)" color="var(--vsc)" />, and rain{' '}
            <Badge label="Rain" bg="var(--info-bg)" color="var(--info)" /> occurred.
          </p>
          <p style={styles.body}>
            Use this context to understand the race before building your scenario.
          </p>
        </div>

        <hr style={styles.divider} />

        {/* Section 4: Simple Mode */}
        <div style={styles.section}>
          <div style={styles.sectionNumber}>04</div>
          <h2 style={styles.sectionTitle}>Building a Scenario — Simple Mode</h2>
          <p style={styles.body}>
            Simple mode is the fastest way to ask "what if." Here is what you can change:
          </p>
          <ul style={styles.list}>
            <li><strong style={{ fontWeight: 500, color: 'var(--text-tertiary)' }}>Pit stop timing</strong> — select a driver, then use the lap sliders to move their pit stops earlier or later</li>
            <li><strong style={{ fontWeight: 500, color: 'var(--text-tertiary)' }}>Tyre compound</strong> — pick a different compound from the dropdown for any stint</li>
            <li><strong style={{ fontWeight: 500, color: 'var(--text-tertiary)' }}>Remove events</strong> — toggle off existing safety cars, VSCs, or red flags</li>
            <li><strong style={{ fontWeight: 500, color: 'var(--text-tertiary)' }}>Inject events</strong> — click "+ Add Event" to create a hypothetical event on any lap range</li>
          </ul>
          <div style={styles.tip}>
            <span style={styles.tipLabel}>Tip</span>
            You can inject multiple events in one scenario. For example, add a VSC on laps 15-17
            <em> and </em> a safety car on laps 30-34 to see how compounding disruptions would have
            changed the race.
          </div>
        </div>

        <hr style={styles.divider} />

        {/* Section 5: Advanced Mode */}
        <div style={styles.section}>
          <div style={styles.sectionNumber}>05</div>
          <h2 style={styles.sectionTitle}>Building a Scenario — Advanced Mode</h2>
          <p style={styles.body}>
            Toggle to Advanced mode for granular control over the simulation parameters:
          </p>
          <ul style={styles.list}>
            <li><strong style={{ fontWeight: 500, color: 'var(--text-tertiary)' }}>Driver overrides</strong> — adjust pace offset (seconds per lap) and tyre management quality per driver</li>
            <li><strong style={{ fontWeight: 500, color: 'var(--text-tertiary)' }}>Event management</strong> — same inject/remove capabilities as Simple mode</li>
            <li><strong style={{ fontWeight: 500, color: 'var(--text-tertiary)' }}>Weather overrides</strong> — change track temperature to simulate hotter or cooler conditions</li>
            <li><strong style={{ fontWeight: 500, color: 'var(--text-tertiary)' }}>Race parameters</strong> — adjust pit loss time and overtake difficulty</li>
          </ul>
          <div style={styles.infoBox}>
            <span style={styles.infoLabel}>Note</span>
            Advanced mode changes apply to the entire field. A higher overtake difficulty means
            fewer position changes for everyone, not just one driver.
          </div>
        </div>

        <hr style={styles.divider} />

        {/* Section 6: Running a Simulation */}
        <div style={styles.section}>
          <div style={styles.sectionNumber}>06</div>
          <h2 style={styles.sectionTitle}>Running a Simulation</h2>
          <p style={styles.body}>
            Click <strong style={{ fontWeight: 500, color: 'var(--text-tertiary)' }}>"Run Simulation"</strong> to
            process your scenario. The engine computes every lap for all 20 drivers, accounting for
            fuel load, tyre degradation, dirty air, pit stops, and any events you have defined.
          </p>
          <p style={styles.body}>
            The results page shows three things:
          </p>
          <ul style={styles.list}>
            <li><strong style={{ fontWeight: 500, color: 'var(--text-tertiary)' }}>Position diff table</strong> — who gained and who lost positions versus the actual result</li>
            <li><strong style={{ fontWeight: 500, color: 'var(--text-tertiary)' }}>Metric cards</strong> — summary statistics like biggest mover and closest gap</li>
            <li><strong style={{ fontWeight: 500, color: 'var(--text-tertiary)' }}>AI narrative</strong> — a natural-language explanation of why the outcome changed</li>
          </ul>
        </div>

        <hr style={styles.divider} />

        {/* Section 7: Lap Replay */}
        <div style={styles.section}>
          <div style={styles.sectionNumber}>07</div>
          <h2 style={styles.sectionTitle}>Lap Replay</h2>
          <p style={styles.body}>
            Watch the simulated race unfold lap by lap. The replay view includes:
          </p>
          <ul style={styles.list}>
            <li><strong style={{ fontWeight: 500, color: 'var(--text-tertiary)' }}>Status banner</strong> — shows the current race state (Green Flag, Safety Car, VSC)</li>
            <li><strong style={{ fontWeight: 500, color: 'var(--text-tertiary)' }}>Position tower</strong> — live timing showing position, driver, tyre compound + age, lap time, gap to leader, and position delta vs actual</li>
            <li><strong style={{ fontWeight: 500, color: 'var(--text-tertiary)' }}>Pit indicator</strong> — a <Badge label="PIT" bg="var(--warning-bg)" color="var(--warning)" /> marker appears when a driver enters the pit lane</li>
          </ul>
          <p style={styles.body}>
            Playback controls at the bottom let you Play/Pause, scrub to any lap, and adjust speed
            with <span style={styles.kbd}>1x</span>{' '}<span style={styles.kbd}>5x</span>{' '}<span style={styles.kbd}>10x</span> buttons.
          </p>
          <div style={styles.tip}>
            <span style={styles.tipLabel}>Tip</span>
            Pause the replay and scrub back to key laps — like the lap a safety car bunched the field
            — to see exactly how the gaps changed.
          </div>
        </div>

        <hr style={styles.divider} />

        {/* Section 8: AI Chat */}
        <div style={styles.section}>
          <div style={styles.sectionNumber}>08</div>
          <h2 style={styles.sectionTitle}>AI Chat</h2>
          <p style={styles.body}>
            Instead of manually building a scenario, you can ask a question in natural language:
          </p>
          <ul style={styles.list}>
            <li>"What if there was no safety car?"</li>
            <li>"What would Hamilton need to beat Norris?"</li>
            <li>"What if Leclerc pitted 3 laps earlier?"</li>
          </ul>
          <p style={styles.body}>
            The AI parses your question and either runs a forward simulation (exploring a scenario)
            or solves for a target condition (reverse-query, finding what inputs produce a specific
            outcome).
          </p>
          <div style={styles.infoBox}>
            <span style={styles.infoLabel}>Requirement</span>
            The AI chat feature requires a valid Anthropic API key configured in the backend.
          </div>
        </div>

        <hr style={styles.divider} />

        {/* Section 9: Sharing */}
        <div style={styles.section}>
          <div style={styles.sectionNumber}>09</div>
          <h2 style={styles.sectionTitle}>Sharing</h2>
          <p style={styles.body}>
            Once you have a simulation result you like, share it with a unique URL. The share page
            shows a summary card with the key outcome — the scenario changes you made and the
            resulting position differences.
          </p>
          <p style={styles.body}>
            Send the link to anyone. They do not need an account to view it.
          </p>
        </div>

        {/* CTA */}
        <div style={styles.ctaContainer}>
          <Link to="/" style={styles.ctaButton}>
            Get Started
          </Link>
        </div>

      </div>
    </div>
  );
}
