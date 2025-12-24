/** Хук для прогнозирования времени */

import { useState, useEffect } from "react";
import { getMLClient } from "../client";
import { ForecastingOutput } from "../types";
import { WeekData } from "@/shared/api/kimaiApi";
import { Settings } from "@/shared/hooks/useSettings";

export function useForecasting(weeks: WeekData[], settings: Settings) {
  const [forecast, setForecast] = useState<ForecastingOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Минимум 4 недели данных для базового прогноза
    if (weeks.length < 4) {
      setForecast(null);
      return;
    }

    const loadForecast = async () => {
      setLoading(true);
      setError(null);

      try {
        const client = getMLClient();
        const result = await client.predict(weeks, settings);
        setForecast(result || null);
      } catch (err) {
        console.error("Forecasting error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setForecast(null);
      } finally {
        setLoading(false);
      }
    };

    // Debounce для избежания частых запросов
    const timeoutId = setTimeout(loadForecast, 500);
    return () => clearTimeout(timeoutId);
  }, [weeks, settings]);

  return { forecast, loading, error };
}
