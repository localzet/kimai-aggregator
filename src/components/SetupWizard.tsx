import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Paper,
  Title,
  Text,
  Stack,
  TextInput,
  Button,
  Alert,
} from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { Settings, useSettings } from "@/shared/hooks/useSettings";
import { createBackendClient } from "@/shared/api/backendClient";

interface SetupWizardProps {
  onComplete: () => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const navigate = useNavigate();
  const { updateSettings, settings } = useSettings();
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const testConnection = async () => {
    if (!apiUrl.trim() || !apiKey.trim()) {
      setConnectionError("Заполните все поля");
      setConnectionStatus("error");
      return;
    }

    try {
      setTestingConnection(true);
      setConnectionError(null);
      setConnectionStatus("idle");

      const base = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
      // Assuming user is logged in, token is in localStorage
      const token = localStorage.getItem("authToken");
      if (!token) {
        const msg = "Требуется авторизация. Пожалуйста, войдите в систему.";
        setConnectionError(msg);
        setConnectionStatus("error");
        notifications.show({
          title: "Ошибка",
          message: msg,
          color: "red",
        });
        return;
      }

      // Use backend client with token
      const backendApi = createBackendClient(base);
      // Update settings on backend
      await backendApi.updateSettings({
        kimaiApiUrl: apiUrl.trim(),
        kimaiApiKey: apiKey.trim(),
      });

      setConnectionStatus("success");
      notifications.show({
        title: "Подключение успешно",
        message: "Настройки сохранены",
        color: "green",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Неизвестная ошибка";
      setConnectionError(errorMessage);
      setConnectionStatus("error");
      notifications.show({
        title: "Ошибка подключения",
        message: errorMessage,
        color: "red",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleComplete = async () => {
    if (connectionStatus !== "success") {
      notifications.show({
        title: "Ошибка",
        message: "Сначала протестируйте подключение",
        color: "red",
      });
      return;
    }

    const newSettings: Settings = {
      ...settings,
      apiUrl: apiUrl.trim(),
      apiKey: apiKey.trim(),
    };

    await updateSettings(newSettings);

    notifications.show({
      title: "Настройка завершена",
      message: "Добро пожаловать!",
      color: "green",
    });

    setTimeout(() => {
      onComplete();
      navigate("/dashboard");
    }, 1000);
  };

  return (
    <Paper p="xl" maw={600} mx="auto" mt="xl">
      <Stack gap="xl">
        <div>
          <Title order={2} mb="xs">
            Настройка Kimai
          </Title>
          <Text c="dimmed">
            Введите URL вашего Kimai сервера и API ключ
          </Text>
        </div>

        <Stack gap="md">
          <TextInput
            label="Kimai API URL"
            placeholder="https://your-kimai.com"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            required
          />

          <TextInput
            label="API Key"
            placeholder="Ваш API ключ"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
            type="password"
          />

          <Button
            onClick={testConnection}
            loading={testingConnection}
            disabled={!apiUrl.trim() || !apiKey.trim()}
          >
            Протестировать подключение
          </Button>

          {connectionStatus === "success" && (
            <Alert color="green" icon={<IconCheck size={16} />}>
              Подключение успешно! Настройки сохранены на сервере.
            </Alert>
          )}

          {connectionStatus === "error" && connectionError && (
            <Alert color="red" icon={<IconX size={16} />}>
              {connectionError}
            </Alert>
          )}

          <Button
            onClick={handleComplete}
            disabled={connectionStatus !== "success"}
            fullWidth
          >
            Завершить настройку
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
