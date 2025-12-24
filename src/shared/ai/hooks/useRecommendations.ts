/** Хук для получения рекомендаций */

import { useState, useEffect } from "react";
import { getMLClient } from "../client";
import { RecommendationOutput } from "../types";
import { WeekData } from "@/shared/api/kimaiApi";
import { Settings } from "@/shared/hooks/useSettings";

export function useRecommendations(weeks: WeekData[], settings: Settings) {
  const [recommendations, setRecommendations] = useState<
    RecommendationOutput[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Минимум 2 недели данных
    if (weeks.length < 2) {
      setRecommendations([]);
      return;
    }

    const loadRecommendations = async () => {
      setLoading(true);
      setError(null);

      try {
        const client = getMLClient();
        const result = await client.getRecommendations(weeks, settings);
        setRecommendations(result || []);
      } catch (err) {
        console.error("Recommendations error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce
    const timeoutId = setTimeout(loadRecommendations, 500);
    return () => clearTimeout(timeoutId);
  }, [weeks, settings]);

  return { recommendations, loading, error };
}
