# Design system

## Theme: Dark minimal

WhatIf-1 uses a dark-only theme inspired by F1 broadcast timing screens and race engineering dashboards. The aesthetic is: carbon-fiber dark, thin type, teal accent, monospace data.

## Fonts

Load via Google Fonts or self-host.

```css
/* Primary: Helvetica Neue stack — clean, thin, wide */
--font-sans: 'Helvetica Neue', Helvetica, Arial, sans-serif;

/* Data/timing: monospace for lap times, gaps, intervals */
--font-mono: 'SF Mono', 'Fira Code', 'JetBrains Mono', Menlo, monospace;
```

Do NOT use Inter, Roboto, or any default system font. Helvetica Neue has the thin weights (200, 300) that give the app its sleek character.

## Type scale

```css
/* Logo */
.logo         { font-size: 28px; font-weight: 300; letter-spacing: -0.5px; color: var(--text-bright); }
.logo-suffix  { font-weight: 200; color: var(--text-muted); }  /* the "-1" part */

/* Headings */
.h1           { font-size: 24px; font-weight: 300; letter-spacing: -0.3px; color: var(--text-bright); }
.h2           { font-size: 18px; font-weight: 400; color: var(--text-primary); }
.h3           { font-size: 14px; font-weight: 500; letter-spacing: 0.3px; color: var(--text-tertiary); }

/* Body */
.body         { font-size: 14px; font-weight: 300; color: var(--text-secondary); line-height: 1.7; }
.body-strong  { font-size: 14px; font-weight: 400; color: var(--text-primary); }

/* Labels */
.label        { font-size: 11px; font-weight: 400; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-muted); }
.caption      { font-size: 12px; font-weight: 300; color: var(--text-secondary); }

/* Data */
.data-large   { font-family: var(--font-mono); font-size: 20px; font-weight: 400; color: var(--text-bright); }
.data-medium  { font-family: var(--font-mono); font-size: 14px; font-weight: 400; color: var(--text-tertiary); }
.data-small   { font-family: var(--font-mono); font-size: 12px; font-weight: 400; color: var(--text-muted); }

/* Driver names in position tower */
.driver-code  { font-size: 13px; font-weight: 500; color: var(--text-primary); letter-spacing: 0.5px; }
```

Key principle: headings use weight 300 (light), body uses 300, only labels and driver codes use 500. This keeps the thin, sleek feel throughout. Never use weight 600 or 700 anywhere.

## Color tokens

### Backgrounds (darkest to lightest)

```css
--bg-base:      #0C0C0E;   /* page background */
--bg-card:      #16161A;   /* card background, elevated surfaces */
--bg-surface:   #1C1C20;   /* input fields, metric cards, hover states */
--bg-elevated:  #222226;   /* dropdowns, popovers, overlays */
```

### Borders

```css
--border-subtle:   #2A2A2E;   /* default borders, dividers */
--border-emphasis: #3A3A3E;   /* hover states, focused inputs */
--border-strong:   #5A5A5E;   /* active/selected states */
```

All borders are 0.5px solid. Never use 1px or thicker except for the AI narrative left accent (2px).

### Text

```css
--text-bright:     #F0EEEA;   /* logo, h1, large data numbers */
--text-primary:    #E8E6E1;   /* main content, driver names */
--text-tertiary:   #C0BEB8;   /* h3, less prominent content */
--text-secondary:  #8A8A8E;   /* body text, descriptions, AI narrative */
--text-muted:      #5A5A5E;   /* labels, position numbers, captions */
--text-disabled:   #3A3A3E;   /* disabled states */
```

### Accent

```css
--accent:          #5DCAA5;   /* primary accent — teal/mint */
--accent-dim:      #2D6B56;   /* accent hover/active state */
--accent-bg:       #143028;   /* accent badge background */
--accent-text:     #04342C;   /* text ON accent background buttons */
```

The accent color is used for:
- Positive position deltas (+1, +4)
- AI narrative left border
- Active toggle background
- Accent/share buttons
- Monospace timing data (selectively)
- Confidence badge
- Active slider fill

### Semantic colors

```css
/* Danger (position loss, red flag) */
--danger:          #E24B4A;
--danger-dim:      #7A2828;
--danger-bg:       #2A1414;
--danger-border:   #3D1414;

/* Warning (safety car, caution) */
--warning:         #EF9F27;
--warning-dim:     #8A5C14;
--warning-bg:      #1E1A0E;
--warning-border:  #3D2F0A;

/* Info (rain, VSC, informational) */
--info:            #3B8BD4;
--info-dim:        #1A4570;
--info-bg:         #0C1A28;
--info-border:     #0C2A4A;

/* Success (green flag) */
--success:         #639922;
--success-dim:     #3A5C14;
--success-bg:      #141E0C;
--success-border:  #1E3008;

/* VSC (purple, distinct from info-blue) */
--vsc:             #9B8AEE;
--vsc-bg:          #14121E;
--vsc-border:      #2A2450;
```

### Tyre compound colors

These are fixed by F1 convention and should not be modified:

```css
--tyre-soft:       #E24B4A;
--tyre-medium:     #EF9F27;
--tyre-hard:       #8A8A8E;   /* note: lighter than standard to read on dark bg */
--tyre-inter:      #5DCAA5;
--tyre-wet:        #3B8BD4;
```

Tyre stint bars use these as background with white (#fff) text labels. Minimum stint bar height: 26px.

### F1 team colors

Use as-is from the F1 standard. These are already designed for dark broadcast backgrounds:

```css
--team-red-bull:      #3671C6;
--team-mclaren:       #FF8000;
--team-ferrari:       #E8002D;
--team-mercedes:      #27F4D2;
--team-aston-martin:  #229971;
--team-alpine:        #FF87BC;
--team-williams:      #64C4FF;
--team-haas:          #B6BABD;
--team-rb:            #6692FF;
--team-sauber:        #52E252;
```

Used for: team color dots, pace bars in position tower, stint bar team-accent mode, chart lines.

## Spacing

```css
--space-xs:  4px;
--space-sm:  8px;
--space-md:  12px;
--space-lg:  16px;
--space-xl:  24px;
--space-2xl: 32px;
--space-3xl: 48px;
```

## Radii

```css
--radius-sm:  4px;    /* stint bars, small tags */
--radius-md:  6px;    /* buttons, inputs, badges */
--radius-lg:  8px;    /* metric cards, surface cards */
--radius-xl:  10px;   /* main cards */
--radius-2xl: 12px;   /* page-level containers */
--radius-pill: 20px;  /* season pills, filter pills */
```

## Component patterns

### Cards

```css
.card {
  background: var(--bg-card);
  border: 0.5px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: 14px 16px;
}
```

No box-shadow anywhere. Elevation is communicated by background color only.

### Inputs

```css
.input {
  background: var(--bg-surface);
  border: 0.5px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  color: var(--text-primary);
  font-size: 13px;
  font-family: var(--font-sans);
  font-weight: 300;
  transition: border-color 0.15s;
}
.input:focus {
  border-color: var(--accent);
  outline: none;
}
.input::placeholder {
  color: var(--text-muted);
}
```

### Buttons

```css
/* Primary: light on dark — high contrast for main actions */
.btn-primary {
  background: var(--text-primary);
  color: var(--bg-base);
  font-weight: 400;
}

/* Secondary: ghost with border */
.btn-secondary {
  background: transparent;
  border: 0.5px solid var(--border-subtle);
  color: var(--text-tertiary);
}
.btn-secondary:hover {
  border-color: var(--border-emphasis);
  background: var(--bg-surface);
}

/* Accent: teal for share/export actions */
.btn-accent {
  background: var(--accent);
  color: var(--accent-text);
}
```

All buttons: `border-radius: var(--radius-md)`, `padding: 8px 18px`, `font-size: 13px`, no text-transform, `cursor: pointer`.

### Badges / tags

Disruption badges use tinted dark backgrounds with matching text:

```css
.badge-sc    { background: var(--warning-bg); color: var(--warning); border: 0.5px solid var(--warning-border); }
.badge-vsc   { background: var(--vsc-bg); color: var(--vsc); border: 0.5px solid var(--vsc-border); }
.badge-rain  { background: var(--info-bg); color: var(--info); border: 0.5px solid var(--info-border); }
.badge-rf    { background: var(--danger-bg); color: var(--danger); border: 0.5px solid var(--danger-border); }
.badge-conf  { background: var(--accent-bg); color: var(--accent); }
```

All badges: `border-radius: var(--radius-pill)`, `padding: 3px 10px`, `font-size: 11px`, `font-weight: 500`.

### Toggle

```css
.toggle {
  width: 34px; height: 18px;
  border-radius: 9px;
  background: var(--border-subtle);
  position: relative;
  cursor: pointer;
  transition: background 0.15s;
}
.toggle.active { background: var(--accent); }
.toggle-knob {
  width: 14px; height: 14px;
  border-radius: 50%;
  background: var(--text-primary);
  position: absolute; top: 2px; left: 2px;
  transition: transform 0.15s;
}
.toggle.active .toggle-knob { transform: translateX(16px); }
```

### Slider / range

```css
.slider-track { height: 3px; background: var(--border-subtle); border-radius: 2px; }
.slider-fill  { height: 3px; background: var(--accent); border-radius: 2px; }
.slider-thumb { width: 14px; height: 14px; background: var(--text-primary); border-radius: 50%; }
```

### Dividers

```css
.divider { height: 0.5px; background: var(--border-subtle); }
```

### AI narrative block

```css
.narrative {
  background: var(--bg-surface);
  border-left: 2px solid var(--accent);  /* only 2px element in the entire app */
  border-radius: 0;  /* sharp corners — intentional contrast with rounded cards */
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 300;
  color: var(--text-secondary);
  line-height: 1.7;
}
```

### Position tower row

```css
.tower-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 0.5px solid var(--bg-surface);
  font-size: 13px;
}
.tower-pos    { width: 20px; text-align: center; color: var(--text-muted); font-size: 12px; }
.tower-dot    { width: 8px; height: 8px; border-radius: 50%; }
.tower-driver { width: 36px; font-weight: 500; color: var(--text-primary); letter-spacing: 0.5px; }
.tower-pace   { flex: 1; height: 4px; background: var(--bg-surface); border-radius: 2px; }
.tower-time   { font-family: var(--font-mono); font-size: 12px; color: var(--text-tertiary); width: 60px; text-align: right; }
.tower-gap    { font-family: var(--font-mono); font-size: 12px; color: var(--text-muted); width: 48px; text-align: right; }
.tower-delta-up { color: var(--accent); font-size: 12px; font-weight: 500; }
.tower-delta-dn { color: var(--danger); font-size: 12px; font-weight: 500; }
```

### Stint bars (strategy chart)

```css
.stint-bar {
  height: 26px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
}
```

Background color from tyre compound. Stint bars sit in a flex row with 1px gap between them.

### Metric card

```css
.metric-card {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
}
.metric-label { font-size: 11px; color: var(--text-muted); margin-bottom: 3px; }
.metric-value { font-size: 20px; font-weight: 300; color: var(--text-bright); }
.metric-note  { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }
```

### Event chips (timeline)

```css
.event-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: var(--radius-md);
  font-size: 11px;
  /* background and color from semantic tokens */
}
.event-chip-dot {
  width: 6px; height: 6px; border-radius: 50%;
}
```

## Animation

Minimal. Only these transitions:

```css
/* State transitions */
transition: border-color 0.15s, background 0.15s, transform 0.15s;

/* Toggle/slider movement */
transition: transform 0.15s ease;

/* Hover feedback on cards */
.card:hover { border-color: var(--border-emphasis); }

/* Button press */
.btn:active { transform: scale(0.98); }
```

No entrance animations, no page transitions, no loading skeletons. If content is loading, show a simple text indicator ("Simulating..." in muted text). No spinners.

## Tailwind configuration

If using TailwindCSS, extend the default config:

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',  // always dark, force class on <html>
  theme: {
    extend: {
      colors: {
        base:    '#0C0C0E',
        card:    '#16161A',
        surface: '#1C1C20',
        elevated:'#222226',
        border: {
          subtle:   '#2A2A2E',
          emphasis: '#3A3A3E',
          strong:   '#5A5A5E',
        },
        text: {
          bright:    '#F0EEEA',
          primary:   '#E8E6E1',
          tertiary:  '#C0BEB8',
          secondary: '#8A8A8E',
          muted:     '#5A5A5E',
          disabled:  '#3A3A3E',
        },
        accent: {
          DEFAULT: '#5DCAA5',
          dim:     '#2D6B56',
          bg:      '#143028',
          text:    '#04342C',
        },
        danger:  { DEFAULT: '#E24B4A', bg: '#2A1414', border: '#3D1414' },
        warning: { DEFAULT: '#EF9F27', bg: '#1E1A0E', border: '#3D2F0A' },
        info:    { DEFAULT: '#3B8BD4', bg: '#0C1A28', border: '#0C2A4A' },
        success: { DEFAULT: '#639922', bg: '#141E0C', border: '#1E3008' },
        vsc:     { DEFAULT: '#9B8AEE', bg: '#14121E', border: '#2A2450' },
        tyre: {
          soft:   '#E24B4A',
          medium: '#EF9F27',
          hard:   '#8A8A8E',
          inter:  '#5DCAA5',
          wet:    '#3B8BD4',
        },
      },
      fontFamily: {
        sans: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"SF Mono"', '"Fira Code"', '"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      borderRadius: {
        sm:   '4px',
        md:   '6px',
        lg:   '8px',
        xl:   '10px',
        '2xl':'12px',
        pill: '20px',
      },
      borderWidth: {
        DEFAULT: '0.5px',
      },
    },
  },
};
```

## Anti-patterns — do NOT do these

- No box shadows anywhere. Elevation = background color only.
- No gradients. Flat fills only.
- No rounded pill buttons for primary actions (pills are for tags/filters only).
- No colored backgrounds for page sections. Background is always var(--bg-base).
- No font-weight above 500.
- No font-size above 28px (except the logo which stays at 28px).
- No uppercase on anything except section labels (which use letter-spacing: 1.5px).
- No borders thicker than 0.5px (except the narrative left accent at 2px).
- No white (#FFFFFF) text. Brightest text is #F0EEEA.
- No saturated background colors for cards. Tinted dark backgrounds only (e.g., danger-bg: #2A1414, not #E24B4A).
