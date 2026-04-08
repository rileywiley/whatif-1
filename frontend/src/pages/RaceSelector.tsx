import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRaces } from '../hooks/useRaces';
import { NavBar } from '../components/common/NavBar';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

const SEASONS = [2024, 2025];

const tagToBadge: Record<string, { variant: 'sc' | 'vsc' | 'rain' | 'red_flag'; label: string }> = {
  safety_car: { variant: 'sc', label: 'SC' },
  vsc: { variant: 'vsc', label: 'VSC' },
  rain: { variant: 'rain', label: 'Rain' },
  red_flag: { variant: 'red_flag', label: 'Red Flag' },
};

export function RaceSelector() {
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { data, isLoading } = useRaces(selectedYear);

  const races = (data?.races ?? []).filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.circuit_name.toLowerCase().includes(search.toLowerCase()) ||
    r.country.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
        {/* Season pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {SEASONS.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              style={{
                background: selectedYear === year ? 'var(--text-primary)' : 'transparent',
                color: selectedYear === year ? 'var(--bg-base)' : 'var(--text-secondary)',
                border: selectedYear === year ? 'none' : '0.5px solid var(--border-subtle)',
                borderRadius: '20px',
                padding: '6px 18px',
                fontSize: '13px',
                fontWeight: 400,
                cursor: 'pointer',
                transition: 'background 0.15s',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {year}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search races..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--bg-surface)',
            border: '0.5px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '8px 12px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 300,
            marginBottom: '20px',
            outline: 'none',
          }}
        />

        {/* Loading */}
        {isLoading && (
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>
            Loading races...
          </div>
        )}

        {/* Race grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
          }}
        >
          {races.map((race) => (
            <Card
              key={race.race_id}
              onClick={() => navigate(`/race/${race.race_id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Round + date */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      fontWeight: 400,
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Round {race.round_number}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {new Date(race.date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>

                {/* Race name */}
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 400,
                    color: 'var(--text-primary)',
                  }}
                >
                  {race.name}
                </div>

                {/* Circuit */}
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {race.circuit_name}
                </div>

                {/* Winner */}
                {race.winner_name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: race.winner_team_color ?? 'var(--text-muted)',
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-tertiary)' }}>
                      {race.winner_name}
                    </span>
                  </div>
                )}

                {/* Badges */}
                {race.disruption_tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {race.disruption_tags.map((tag) => {
                      const b = tagToBadge[tag];
                      return b ? <Badge key={tag} variant={b.variant} label={b.label} /> : null;
                    })}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
