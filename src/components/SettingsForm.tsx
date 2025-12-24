import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Paper,
  TextInput,
  NumberInput,
  Button,
  Stack,
  Title,
  Divider,
  Switch,
  Group,
  Text,
  Loader,
  Alert,
  Accordion,
  FileButton,
  MultiSelect,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useForm } from "@mantine/form";
import { KimaiApi, Project } from "@/shared/api/kimaiApi";
import { Settings } from "@/shared/hooks/useSettings";
import ProjectSettingsForm from "./ProjectSettingsForm";
import CalendarSyncSettings from "./CalendarSyncSettings";
import { MixIdConnection } from "@localzet/data-connector/components";

interface SettingsFormProps {
  settings: Settings;
  onUpdate: (settings: Settings) => void;
}

export default function SettingsForm({
  settings,
  onUpdate,
}: SettingsFormProps) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  // Запоминаем, были ли настройки пустыми до сохранения
  const wasEmpty = !settings.apiUrl || !settings.apiKey;

  const form = useForm({
    initialValues: {
      apiUrl: settings.apiUrl || "",
      apiKey: settings.apiKey || "",
      ratePerMinute: settings.ratePerMinute || 0,
      useProxy: settings.useProxy || false,
      excludedTags: (settings.excludedTags || []).join(", "),
    },
  });

  const loadProjects = async () => {
    // Проверяем наличие всех необходимых данных
    if (
      !form.values.apiUrl ||
      !form.values.apiKey ||
      !form.values.apiUrl.trim() ||
      !form.values.apiKey.trim()
    ) {
      setProjects([]);
      return;
    }

    try {
      setLoadingProjects(true);
      setError(null);
      const api = new KimaiApi(
        form.values.apiUrl.trim(),
        form.values.apiKey.trim(),
        form.values.useProxy,
      );
      const projectsData = await api.getProjects();
      setProjects(projectsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки проектов");
      console.error("Error loading projects:", err);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadTags = async () => {
    if (!form.values.apiUrl.trim() || !form.values.apiKey.trim()) return;
    try {
      const api = new KimaiApi(
        form.values.apiUrl.trim(),
        form.values.apiKey.trim(),
        form.values.useProxy,
      );
      const data = (await api.getTags()) as string[];
      setTags(data);
    } catch (e) {
      console.error("Error loading tags:", e);
    }
  };

  useEffect(() => {
    // Загружаем проекты только если есть и URL и ключ
    const hasUrl = form.values.apiUrl && form.values.apiUrl.trim();
    const hasKey = form.values.apiKey && form.values.apiKey.trim();

    if (hasUrl && hasKey) {
      // Небольшая задержка, чтобы пользователь успел ввести данные
      const timeoutId = setTimeout(() => {
        loadProjects();
        loadTags();
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      setProjects([]);
    }
  }, [form.values.apiUrl, form.values.apiKey, form.values.useProxy]);

  const getProjectSettings = (projectId: number) => {
    return (
      settings.projectSettings?.[projectId] || {
        enabled: false,
        hasWeeklyGoal: false,
        weeklyGoalHours: 20,
        hasPaymentPeriods: false,
        paymentPeriodWeeks: 2,
        startWeekNumber: 1,
        startYear: new Date().getFullYear(),
        hasStages: false,
        stages: [],
      }
    );
  };

  const updateProjectSetting = (
    projectId: number,
    field: string,
    value: unknown,
  ) => {
    const currentSettings = { ...settings };
    if (!currentSettings.projectSettings) {
      currentSettings.projectSettings = {};
    }
    if (!currentSettings.projectSettings[projectId]) {
      currentSettings.projectSettings[projectId] =
        getProjectSettings(projectId);
    }
    currentSettings.projectSettings[projectId] = {
      ...currentSettings.projectSettings[projectId],
      [field]: value,
    };
    onUpdate(currentSettings);
  };

  const handleSubmit = (values: typeof form.values) => {
    const excludedTagsArray = values.excludedTags
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0);

    const newSettings: Settings = {
      ...settings,
      apiUrl: values.apiUrl,
      apiKey: values.apiKey,
      ratePerMinute: values.ratePerMinute,
      useProxy: values.useProxy || false,
      excludedTags: excludedTagsArray,
    };

    const isNowConfigured = !!(newSettings.apiUrl && newSettings.apiKey);
    const wasConfigured = !!(settings.apiUrl && settings.apiKey);

    onUpdate(newSettings);

    // Небольшая задержка, чтобы состояние успело обновиться
    setTimeout(() => {
      notifications.show({
        title: "Настройки сохранены",
        message:
          isNowConfigured && !wasConfigured
            ? "Настройки сохранены. Меню обновлено. Перенаправление на главную страницу..."
            : "Все изменения успешно сохранены",
        color: "green",
      });

      // Если настройки были пустыми, а теперь заполнены - перенаправляем на dashboard
      // Используем window.location для полной перезагрузки, чтобы меню обновилось
      if (isNowConfigured && !wasConfigured) {
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1000);
      }
    }, 100);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kimai-settings-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notifications.show({
      title: "Настройки экспортированы",
      message: "Файл настроек успешно скачан",
      color: "blue",
    });
  };

  const handleImport = (file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as Settings;
        const wasConfigured = !!(settings.apiUrl && settings.apiKey);
        const isNowConfigured = !!(imported.apiUrl && imported.apiKey);

        onUpdate(imported);
        // Обновляем форму и перезагружаем проекты после импорта
        if (imported.apiUrl && imported.apiKey) {
          form.setFieldValue("apiUrl", imported.apiUrl);
          form.setFieldValue("apiKey", imported.apiKey);
          // Проекты загрузятся автоматически через useEffect
        }

        setTimeout(() => {
          notifications.show({
            title: "Настройки импортированы",
            message:
              isNowConfigured && !wasConfigured
                ? "Настройки импортированы. Меню обновлено. Перенаправление на главную страницу..."
                : "Настройки успешно загружены из файла",
            color: "green",
          });

          if (isNowConfigured && !wasConfigured) {
            setTimeout(() => {
              navigate("/dashboard");
            }, 1000);
          }
        }, 100);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Неизвестная ошибка";
        setError("Ошибка при импорте файла: " + errorMessage);
        notifications.show({
          title: "Ошибка импорта",
          message: errorMessage,
          color: "red",
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <Stack gap="xl">
      <MixIdConnection
        onConnected={() => {}}
        onDisconnected={() => {}}
        showSyncSettings={true}
        showSyncData={true}
        notifications={notifications}
      />

      <Paper p="xl" withBorder>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Title order={3}>API Настройки</Title>

            <TextInput
              label="URL Kimai"
              placeholder="https://kimai.example.com"
              required
              {...form.getInputProps("apiUrl")}
            />

            <TextInput
              label="API Key"
              type="password"
              required
              {...form.getInputProps("apiKey")}
            />

            <NumberInput
              label="Ставка за минуту (руб)"
              min={0}
              step={0.01}
              required
              {...form.getInputProps("ratePerMinute")}
            />

            <MultiSelect
              label="Исключённые теги"
              data={tags}
              searchable
              clearable
              description="Отметьте теги, которые нужно исключить"
              value={form.values.excludedTags
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t.length > 0)}
              onChange={(vals) => {
                const cleaned = vals
                  .map((v) => v.trim())
                  .filter((v) => v.length > 0);
                form.setFieldValue("excludedTags", cleaned.join(", "));
              }}
            />

            {import.meta.env.DEV && (
              <Switch
                label="Использовать прокси для обхода CORS (только в dev режиме)"
                description="Включите, если возникают ошибки CORS. Прокси настроен на URL из переменной окружения VITE_KIMAI_URL"
                {...form.getInputProps("useProxy", { type: "checkbox" })}
              />
            )}

            <Button type="submit" mt="md">
              Сохранить настройки
            </Button>
          </Stack>
        </form>
      </Paper>

      <CalendarSyncSettings
        settings={
          settings.calendarSync || {
            enabled: false,
            syncType: null,
            syncPastDays: 30,
            syncFutureDays: 7,
            autoSync: false,
          }
        }
        onUpdate={(calendarSync) => {
          onUpdate({
            ...settings,
            calendarSync,
          });
        }}
      />

      <Paper p="xl" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={3}>Настройки проектов</Title>
            <Group>
              <FileButton onChange={handleImport} accept="application/json">
                {(props) => (
                  <Button {...props} variant="light">
                    Импорт настроек
                  </Button>
                )}
              </FileButton>
              <Button onClick={handleExport} variant="light">
                Экспорт настроек
              </Button>
            </Group>
          </Group>

          {error && (
            <Alert color="red" title="Ошибка">
              {error}
            </Alert>
          )}

          {loadingProjects ? (
            <Loader />
          ) : projects.length === 0 ? (
            <Text c="dimmed">
              {form.values.apiUrl && form.values.apiKey
                ? "Проекты не найдены или произошла ошибка загрузки"
                : "Заполните URL и API Key для загрузки проектов"}
            </Text>
          ) : (
            <Accordion>
              {projects.map((project) => {
                const projectSettings = getProjectSettings(project.id);
                return (
                  <Accordion.Item
                    key={project.id}
                    value={`project-${project.id}`}
                  >
                    <Accordion.Control>
                      <Group justify="space-between">
                        <Text fw={500}>{project.name}</Text>
                        <Switch
                          checked={projectSettings.enabled}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateProjectSetting(
                              project.id,
                              "enabled",
                              e.currentTarget.checked,
                            );
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <ProjectSettingsForm
                        project={project}
                        settings={settings}
                        onUpdate={onUpdate}
                      />
                    </Accordion.Panel>
                  </Accordion.Item>
                );
              })}
            </Accordion>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
