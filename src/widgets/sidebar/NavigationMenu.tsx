/**
 * NavigationMenu
 *
 * Виджет навигационного меню в сайдбаре.
 * Отображает меню навигации в зависимости от наличия настроек.
 */

import { useMemo } from "react";
import { useSettings } from "@/shared/hooks/useSettings";
import { MenuItem } from "@/widgets/layout/types";
import { PiCpu, PiListChecks, PiStarDuotone } from "react-icons/pi";
import {
  TbDeviceAnalytics,
  TbReportAnalytics,
  TbCalendar,
  TbClockHour4,
  TbBrain,
} from "react-icons/tb";
import { HiCurrencyDollar } from "react-icons/hi";

export function useNavigationMenu(): MenuItem[] {
  const { settings, loading } = useSettings();
  const showFullMenu = !loading && !!(settings.apiUrl && settings.apiKey);

  return useMemo(() => {
    const menu: MenuItem[] = [];

    if (showFullMenu) {
      menu.unshift({
        id: "main",
        header: "Меню",
        section: [
          {
            id: "dashboard",
            href: "/dashboard",
            name: "Главная",
            icon: PiStarDuotone,
          },
          {
            id: "timesheet",
            href: "/timesheet",
            name: "Таблица времени",
            icon: PiListChecks,
          },
          {
            id: "financial",
            href: "/financial",
            name: "Финансы",
            icon: HiCurrencyDollar,
          },
          {
            id: "payment-history",
            href: "/payment-history",
            name: "История оплат",
            icon: TbReportAnalytics,
          },
          {
            id: "statistics",
            href: "/statistics",
            name: "Статистика",
            icon: TbDeviceAnalytics,
          },
          {
            id: "calendar",
            href: "/calendar",
            name: "Календарь",
            icon: TbCalendar,
          },
          {
            id: "time-analysis",
            href: "/time-analysis",
            name: "Анализ времени",
            icon: TbClockHour4,
          },
          {
            id: "ml-insights",
            href: "/ml-insights",
            name: "AI Инсайты",
            icon: TbBrain,
          },
        ],
      });
    }

    menu.push({
      id: "main-settings",
      header: "Параметры",
      section: [
        {
          id: "settings",
          href: "/settings",
          name: "Настройки",
          icon: PiCpu,
        },
      ],
    });

    return menu;
  }, [showFullMenu]);
}
