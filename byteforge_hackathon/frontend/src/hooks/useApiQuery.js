import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient.js';

export function useApiQuery(key, path) {
  return useQuery({
    queryKey: key,
    queryFn: () => api.get(path),
  });
}

export function useInvalidate() {
  const client = useQueryClient();
  return (...keys) => keys.forEach((key) => client.invalidateQueries({ queryKey: key }));
}

export function useApiMutation(method, pathBuilder, invalidateKeys = []) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input) => {
      const path = typeof pathBuilder === 'function' ? pathBuilder(input) : pathBuilder;
      if (method === 'delete') return api.delete(path);
      return api[method](path, input.body ?? input);
    },
    onSuccess: () => {
      invalidateKeys.forEach((key) => client.invalidateQueries({ queryKey: key }));
    },
  });
}
