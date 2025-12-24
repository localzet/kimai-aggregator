/** Хук для анализа продуктивности */

import { useState, useEffect } from "react";
import { getMLClient } from "../client";
import { ProductivityOutput } from "../types";
import { WeekData } from "@/shared/api/kimaiApi";
import { Settings } from "@/shared/hooks/useSettings";

export function useProductivity(weeks: WeekData[], settings: Settings) {
  const [productivity, setProductivity] = useState<ProductivityOutput | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const totalEntries = weeks.reduce(
      (sum, w) => sum + (w.entries?.length || 0),
      0,
    );
    if (totalEntries < 10) {
      setProductivity(null);
      return;
    }

    const loadProductivity = async () => {
      setLoading(true);
      setError(null);

      try {
        const client = getMLClient();
        const result = await client.analyzeProductivity(weeks, settings);
        setProductivity(result || null);
      } catch (err) {
        console.error("Productivity analysis error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setProductivity(null);
      } finally {
        setLoading(false);
      }
    };

    // Debounce
    const timeoutId = setTimeout(loadProductivity, 500);
    return () => clearTimeout(timeoutId);
  }, [weeks, settings]);

  return { productivity, loading, error };
}
