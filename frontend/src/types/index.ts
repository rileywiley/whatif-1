export interface Race {
  race_id: string;
  name: string;
  circuit: Circuit;
  year: number;
  round_number: number;
  date: string;
  total_laps: number;
  drivers: DriverEntry[];
  events: RaceEvent[];
  weather_summary: WeatherSummary | null;
}

export interface Circuit {
  circuit_id: string;
  name: string;
  track_length_km: number;
  pit_loss_seconds: number;
  overtake_difficulty: number;
  drs_zones: number;
}

export interface RaceListItem {
  race_id: string;
  name: string;
  circuit_name: string;
  country: string;
  year: number;
  round_number: number;
  date: string;
  total_laps: number;
  winner_driver_id: string | null;
  winner_name: string | null;
  winner_team_color: string | null;
  disruption_tags: string[];
}

export interface DriverEntry {
  entry_id: string;
  driver_id: string;
  driver_name: string;
  team_id: string;
  team_name: string;
  team_color: string;
  driver_number: number;
  grid_position: number;
  finish_position: number | null;
  status: string;
  points_scored: number;
  pit_stops: PitStop[];
  stints: Stint[];
}

export interface PitStop {
  stop_number: number;
  lap_number: number;
  stop_duration_seconds: number;
  tyre_from: string;
  tyre_to: string;
  was_under_sc: boolean;
}

export interface Stint {
  compound: string;
  start_lap: number;
  end_lap: number;
  laps: number;
}

export interface RaceEvent {
  event_id: string;
  event_type: string;
  lap_start: number;
  lap_end: number;
  trigger_driver_id: string | null;
  details: string | null;
}

export interface ScenarioInput {
  pit_overrides?: Record<string, { stops: { lap: number; compound_to: string }[] }>;
  event_overrides?: { event_id?: string; action: string; event_type?: string; lap_start?: number; lap_end?: number }[];
  weather_overrides?: { lap_range: number[]; rainfall_intensity_mm_hr?: number }[];
  driver_overrides?: Record<string, { pace_offset_seconds?: number; tyre_management_pct?: number }>;
  race_param_overrides?: { pit_loss_seconds?: number; overtake_difficulty?: number };
  description?: string;
}

export interface SimResult {
  scenario_id: string;
  finish_order: string[];
  position_history: Record<string, number[]>;
  simulated_laps: Record<string, SimLap[]>;
  diff_summary: Record<string, DiffEntry>;
  key_divergence_lap: number | null;
  confidence_score: number;
  narrative: string | null;
}

export interface SimLap {
  lap_number: number;
  lap_time: number;
  position: number;
  gap_to_leader: number;
  interval: number;
  tyre_compound: string;
  tyre_age: number;
  fuel_load_kg: number;
}

export interface DiffEntry {
  driver_name: string;
  team_id: string;
  team_color: string;
  actual_position: number | null;
  simulated_position: number | null;
  position_delta: number | null;
}

export interface WeatherSummary {
  avg_air_temp_celsius: number;
  avg_track_temp_celsius: number;
  rain_laps: number[];
  max_rainfall_mm_hr: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DriverReplayState {
  driver_id: string;
  driver_name: string;
  team_color: string;
  position: number;
  lap_time: number;
  gap_to_leader: number;
  tyre_compound: string;
  tyre_age: number;
  actual_position: number;
  pace_relative: number;
  is_pitting?: boolean;
}
