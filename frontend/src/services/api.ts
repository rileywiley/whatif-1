import type { RaceListItem, ScenarioInput, SimResult, Race } from '../types';

const BASE_URL = '/api/v1';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`);
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
  return res.json();
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
  return res.json();
}

export const api = {
  fetchRaces: (year?: number) =>
    fetchJson<{ races: RaceListItem[]; available_years: number[] }>(
      `/races${year ? `?year=${year}` : ''}`
    ),

  fetchRace: async (raceId: string): Promise<Race> => {
    const data = await fetchJson<{ race: Omit<Race, 'drivers' | 'events' | 'weather_summary'>; drivers: Race['drivers']; events: Race['events']; weather_summary: Race['weather_summary'] }>(`/races/${raceId}`);
    return { ...data.race, drivers: data.drivers, events: data.events, weather_summary: data.weather_summary };
  },

  fetchLaps: (raceId: string, driverId?: string) =>
    fetchJson<unknown>(`/races/${raceId}/laps${driverId ? `?driver_id=${driverId}` : ''}`),

  simulate: (raceId: string, scenario: ScenarioInput) =>
    postJson<{ scenario_id: string; result: Record<string, unknown>; computation_time_ms: number }>(`/races/${raceId}/simulate`, scenario),

  solve: (raceId: string, query: string) =>
    postJson<{ scenario: ScenarioInput; result: SimResult; explanation: string }>(
      `/races/${raceId}/solve`,
      { query }
    ),

  fetchScenario: (scenarioId: string) =>
    fetchJson<{ race: Race; scenario: ScenarioInput; result: SimResult }>(
      `/scenarios/${scenarioId}`
    ),

  fetchCommentary: (
    raceId: string,
    scenarioId: string,
    lap: number,
    driverId?: string
  ) =>
    postJson<{ commentary: string }>(
      `/races/${raceId}/commentary`,
      { scenario_id: scenarioId, lap_number: lap, focus_driver_id: driverId }
    ),

  fetchSuggestions: (raceId: string) =>
    fetchJson<{ suggestions: string[] }>(`/races/${raceId}/suggestions`),
};
