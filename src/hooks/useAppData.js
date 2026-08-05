import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAppData } from "../services/database";
import { supabase } from "../services/supabase";
import { emptyAppData } from "../services/database";
import {
  users as dummyUsers,
  clients as dummyClients,
  tasks as dummyTasks,
  taxWorks as dummyTaxWorks,
  attendance as dummyAttendance,
  analytics as dummyAnalytics,
  reportTypes as dummyReportTypes
} from "../data/dummy";

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

  // Fallback to dummy data if no data from Supabase OR if data is empty
  const hasEmptyData = data && Object.values(data).every(arr => Array.isArray(arr) && arr.length === 0);
  const safeData = (!data || hasEmptyData)
    ? {
        ...emptyAppData,
        users: dummyUsers,
        clients: dummyClients,
        tasks: dummyTasks,
        taxWorks: dummyTaxWorks,
        attendance: dummyAttendance,
        analytics: dummyAnalytics,
        reportTypes: dummyReportTypes,
      }
    : data;

  return { data: safeData, isLoading, error };
}
