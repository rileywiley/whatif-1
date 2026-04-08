import { useMutation } from '@tanstack/react-query';
import { api } from '../services/api';
import type { ScenarioInput, SimResult } from '../types';

export function useSimulation(raceId: string) {
  return useMutation<SimResult, Error, ScenarioInput>({
    mutationFn: (scenario) => api.simulate(raceId, scenario),
  });
}
