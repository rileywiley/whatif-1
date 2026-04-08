import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function useRaces(year?: number) {
  return useQuery({
    queryKey: ['races', year],
    queryFn: () => api.fetchRaces(year),
  });
}
