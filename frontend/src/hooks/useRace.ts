import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function useRace(raceId: string | undefined) {
  return useQuery({
    queryKey: ['race', raceId],
    queryFn: () => api.fetchRace(raceId!),
    enabled: !!raceId,
  });
}
