import { create } from 'zustand';
import type { Race, ScenarioInput, SimResult, ChatMessage } from '../types';
import { api } from '../services/api';

interface AppState {
  currentRace: Race | null;
  setCurrentRace: (race: Race | null) => void;

  editorMode: 'simple' | 'advanced';
  setEditorMode: (mode: 'simple' | 'advanced') => void;

  scenario: ScenarioInput;
  setScenario: (scenario: ScenarioInput) => void;
  updateScenario: (partial: Partial<ScenarioInput>) => void;
  resetScenario: () => void;

  simResult: SimResult | null;
  setSimResult: (result: SimResult | null) => void;
  simLoading: boolean;
  runSimulation: (raceId: string) => Promise<void>;

  replayLap: number;
  replayPlaying: boolean;
  replaySpeed: 1 | 5 | 10;
  setReplayLap: (lap: number) => void;
  toggleReplayPlay: () => void;
  setReplaySpeed: (speed: 1 | 5 | 10) => void;

  chatMessages: ChatMessage[];
  chatLoading: boolean;
  sendChatMessage: (raceId: string, message: string) => Promise<void>;
  clearChat: () => void;
}

const emptyScenario: ScenarioInput = {};

export const useAppStore = create<AppState>((set, get) => ({
  currentRace: null,
  setCurrentRace: (race) => set({ currentRace: race }),

  editorMode: 'simple',
  setEditorMode: (mode) => set({ editorMode: mode }),

  scenario: { ...emptyScenario },
  setScenario: (scenario) => set({ scenario }),
  updateScenario: (partial) =>
    set((state) => ({ scenario: { ...state.scenario, ...partial } })),
  resetScenario: () => set({ scenario: { ...emptyScenario }, simResult: null }),

  simResult: null,
  setSimResult: (result) => set({ simResult: result }),
  simLoading: false,
  runSimulation: async (raceId: string) => {
    set({ simLoading: true });
    try {
      const resp = await api.simulate(raceId, get().scenario);
      // API returns { scenario_id, result: { finish_order, ... }, computation_time_ms }
      const simResult = { scenario_id: resp.scenario_id, ...resp.result } as SimResult;
      set({ simResult, simLoading: false });
    } catch {
      set({ simLoading: false });
    }
  },

  replayLap: 1,
  replayPlaying: false,
  replaySpeed: 1,
  setReplayLap: (lap) => set({ replayLap: lap }),
  toggleReplayPlay: () => set((s) => ({ replayPlaying: !s.replayPlaying })),
  setReplaySpeed: (speed) => set({ replaySpeed: speed }),

  chatMessages: [],
  chatLoading: false,
  sendChatMessage: async (raceId: string, message: string) => {
    const userMsg: ChatMessage = { role: 'user', content: message };
    set((s) => ({
      chatMessages: [...s.chatMessages, userMsg],
      chatLoading: true,
    }));
    try {
      const resp = await api.solve(raceId, message);
      // API returns: { query_parsed, message?, narrative?, sim_result?, scenario_id?, answer? }
      const content =
        resp.narrative ??
        resp.message ??
        resp.answer?.threshold_value != null
          ? `Threshold: ${resp.answer.threshold_value}s per lap (${resp.answer.is_feasible ? 'feasible' : 'unlikely'})`
          : 'Simulation complete.';
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: String(content),
      };
      const updates: Partial<AppState> = {
        chatMessages: [...get().chatMessages, assistantMsg],
        chatLoading: false,
      };
      if (resp.sim_result) {
        updates.simResult = { scenario_id: resp.scenario_id ?? '', ...resp.sim_result } as SimResult;
      }
      set(updates as AppState);
    } catch {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      };
      set((s) => ({
        chatMessages: [...s.chatMessages, errorMsg],
        chatLoading: false,
      }));
    }
  },
  clearChat: () => set({ chatMessages: [] }),
}));
