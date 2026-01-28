/**
 * LogoutButton
 *
 * Кнопка выхода из системы.
 * Очищает токены и перенаправляет на страницу авторизации.
 */

import { Button } from "@mantine/core";
import { TbLogout } from "react-icons/tb";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/shared/hooks/useSettings";
import { removeToken } from "@entities/session-store";
import { notifications } from "@mantine/notifications";
import { createBackendClient } from "@/shared/api/backendClient";

export function LogoutButton() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();

  const handleLogout = () => {
    // Call backend logout to invalidate sessions server-side if possible
    try {
      const backendUrl =
        settings.backendUrl ||
        (import.meta.env.VITE_BACKEND_URL as string) ||
        "https://kimai-api.zorin.cloud";
      if (backendUrl) {
        const api = createBackendClient(backendUrl);
        api.logout().catch((e) => console.warn("Backend logout failed:", e));
      }
    } catch (e) {
      console.warn("Error calling backend logout:", e);
    }

    // Очищаем токены локально
    const clearedSettings = {
      ...settings,
      backendToken: "",
    };
    updateSettings(clearedSettings);

    try {
      // clear tokens stored in session store
      removeToken();
      const saved = localStorage.getItem("kimai-settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        localStorage.setItem(
          "kimai-settings",
          JSON.stringify({
            ...parsed,
            backendToken: "",
          }),
        );
      }
    } catch (e) {
      console.warn("Error clearing tokens:", e);
    }

    notifications.show({
      title: "Выход выполнен",
      message: "Вы успешно вышли из системы",
      color: "blue",
    });

    navigate("/auth", { replace: true });
  };

  if (!settings.backendToken) {
    return null;
  }

  return (
    <Button
      variant="subtle"
      color="red"
      leftSection={<TbLogout size="1rem" />}
      onClick={handleLogout}
      size="sm"
    >
      Выход
    </Button>
  );
}
