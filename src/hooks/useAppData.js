import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAppData } from "../services/database";
import { supabase } from "../services/supabase";
import { emptyAppData } from "../services/database";


export function useAppData() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const channel = client
      .channel("public-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tax" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["umara-dashboard"] });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [queryClient]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["umara-dashboard"],
    queryFn: fetchAppData,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
    retry: 3,
  });

  const hasEmptyData = data && Object.values(data).every(arr => Array.isArray(arr) && arr.length === 0);
  const safeData = (!data || hasEmptyData)
    ? emptyAppData
    : data;

  return { data: safeData, isLoading, error };
}
