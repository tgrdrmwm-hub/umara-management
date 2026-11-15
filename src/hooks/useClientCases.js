import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchClientCases,
  createClientCase,
  updateClientCase,
  deleteClientCase,
} from "../services/clientCases";
import { supabase } from "../services/supabase";
import { useEffect } from "react";

const QUERY_KEY = ["client-cases"];

export function useClientCases() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!supabase) return;

    try {
      const channel = supabase
        .channel("public-client-cases")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "client_cases" },
          () => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
          },
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn("Failed to subscribe to client_cases realtime channel:", err);
    }
  }, [queryClient]);

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchClientCases,
    staleTime: 5_000,
  });

  const createMutation = useMutation({
    mutationFn: createClientCase,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => updateClientCase(id, updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteClientCase(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    cases: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    createCase: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateCase: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteCase: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

