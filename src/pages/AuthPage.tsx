import { Center, Card, Stack, Title, Text, Container } from "@mantine/core";
import { MixIdConnection } from "@localzet/data-connector/components";
import { notifications } from "@mantine/notifications";
import { useNavigate } from "react-router-dom";
import { useMixIdStatus } from "@localzet/data-connector/hooks";
import { mixIdApi } from "@/shared/mixIdStub";
import { useSettings } from "@/shared/hooks/useSettings";
import { BackendApi } from "@/shared/api/backendApi";
import { useEffect, useState } from "react";
import { Page } from "@/shared/ui";
import { Button } from "@mantine/core";
import LocalAuthForm from "@/components/LocalAuthForm";

function AuthPage() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();

  const { isConnected, syncStatus, hasConfig } = useMixIdStatus();
  const [loading, setLoading] = useState(true);
  const [syncStatusData, setSyncStatusData] = useState<{
    syncSettings: boolean;
    syncData: boolean;
    lastSyncAt: string | null;
  } | null>(null);
  const [syncSettings, setSyncSettings] = useState(false);
  const [syncData, setSyncData] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const config = mixIdApi.getConfig();
      if (!config || !config.accessToken) {
        setSyncStatusData(null);
        return;
      }

      const status = await mixIdApi.getSyncStatus();
      setSyncStatusData(status);
      setSyncSettings(status.syncSettings);
      setSyncData(status.syncData);
    } catch (error) {
      setSyncStatusData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConnected = async (authCode?: string) => {
    try {
      console.debug("AuthPage.handleConnected authCode=", authCode);
      // 1) Авторизуемся в бэкенде через MIX ID и получаем токен.
      // Prefer server-side exchange when we received an auth code.
      const defaultBackendUrl =
        (import.meta.env.VITE_BACKEND_URL as string) ||
        "https://kimai-api.zorin.cloud";
      const backendUrl = settings.backendUrl || defaultBackendUrl;

      let backendToken: string | null = null;
      let backendApi: BackendApi | null = null;

      if (backendUrl) {
        try {
          backendApi = new BackendApi(backendUrl.trim());
          let authResponse;
          if (authCode) {
            const redirectUri =
              typeof window !== "undefined"
                ? window.location.origin + "/mixid-callback"
                : undefined;
            authResponse = await backendApi.exchangeMixIdCode(
              authCode,
              redirectUri,
            );
          } else {
            // Fallback: try previous flow where frontend already has a MIX ID token
            const mixIdToken =
              localStorage.getItem("mixid_access_token") ||
              localStorage.getItem("mixid_token") ||
              (window as any).mixidToken;
            if (mixIdToken) {
              authResponse = await backendApi.login(mixIdToken);
            } else {
              authResponse = null;
            }
          }
          backendToken = authResponse?.token || null;
          backendApi.setToken(backendToken);
          // Persist refresh token (temporary local storage; consider httpOnly cookie)
          if (authResponse?.refresh_token) {
            try {
              localStorage.setItem(
                "backend_refresh_token",
                authResponse.refresh_token,
              );
            } catch (e) {
              console.warn("Could not save backend refresh token:", e);
            }
          }
        } catch (e) {
          console.warn("Backend auth via MIX ID failed on AuthPage:", e);
        }
      }

      // 2) Пытаемся получить настройки из MIX ID и синхронизировать с бэком
      const apiBase =
        import.meta.env.VITE_MIX_ID_API_BASE ||
        "https://data-center.zorin.cloud/api";
      const clientId = import.meta.env.VITE_MIX_ID_CLIENT_ID || "";
      const clientSecret = import.meta.env.VITE_MIX_ID_CLIENT_SECRET || "";

      let remoteSettings: any | null = null;
      if (clientId && clientSecret) {
        try {
          mixIdApi.setConfig({ apiBase, clientId, clientSecret });
          remoteSettings = await mixIdApi.downloadSettings();
        } catch (e) {
          console.warn("Could not download settings from MIX ID:", e);
        }
      }

      const downloadedSettings = remoteSettings?.settings;

      // Получаем текущие настройки с бэка (если есть бэкенд и токен)
      let backendSettings: any = null;
      if (backendApi && backendToken) {
        try {
          backendSettings = await backendApi.getSettings();
        } catch (e) {
          console.warn("Could not get settings from backend:", e);
        }
      }

      // Определяем актуальные настройки: приоритет у MIX ID, если их нет - используем бэкенд
      const effectiveSettings = downloadedSettings || backendSettings;

      // Если есть настройки из MIX ID, отправляем их в бэкенд
      if (
        backendApi &&
        backendToken &&
        downloadedSettings &&
        downloadedSettings.apiUrl &&
        downloadedSettings.apiKey
      ) {
        try {
          await backendApi.updateSettings({
            kimai_api_url: downloadedSettings.apiUrl,
            kimai_api_key: downloadedSettings.apiKey,
            rate_per_minute: downloadedSettings.ratePerMinute || 0,
            project_settings: downloadedSettings.projectSettings || {},
            excluded_tags: downloadedSettings.excludedTags || [],
            calendar_sync: downloadedSettings.calendarSync || {},
          } as any);
        } catch (e) {
          console.warn("Could not push settings to backend on AuthPage:", e);
        }
      }

      // Если на бэке нет настроек, но есть локальные - отправляем их
      if (
        backendApi &&
        backendToken &&
        !backendSettings &&
        settings.apiUrl &&
        settings.apiKey
      ) {
        try {
          await backendApi.updateSettings({
            kimai_api_url: settings.apiUrl,
            kimai_api_key: settings.apiKey,
            rate_per_minute: settings.ratePerMinute,
            project_settings: settings.projectSettings,
            excluded_tags: settings.excludedTags,
            calendar_sync: settings.calendarSync,
          } as any);
        } catch (e) {
          console.warn(
            "Could not push local settings to backend on AuthPage:",
            e,
          );
        }
      }

      // Триггерим начальный импорт из Kimai (если настройки есть)
      const finalSettings = effectiveSettings || backendSettings || settings;
      if (
        backendApi &&
        backendToken &&
        finalSettings?.apiUrl &&
        finalSettings?.apiKey
      ) {
        await backendApi.triggerSync().catch((e) => {
          console.warn("Could not trigger initial Kimai sync:", e);
        });
      }

      // 3) Локально сохраняем настройки и токен бэкенда
      const localSettings = {
        ...(effectiveSettings || backendSettings || settings),
        appMode: "normal" as const,
        backendUrl,
        backendToken: backendToken || settings.backendToken || "",
      };
      updateSettings(localSettings);

      notifications.show({
        title: "MIX ID подключён",
        message: backendToken
          ? "Бэкенд авторизован. Настройки синхронизированы с MIX ID и бэкендом."
          : "MIX ID подключён. Настройки загружены из MIX ID.",
        color: "green",
      });

      // Проверяем наличие настроек и редиректим соответственно
      // Only consider the user fully logged into the app if backend issued a token.
      const hasSettings =
        (effectiveSettings || backendSettings)?.apiUrl &&
        (effectiveSettings || backendSettings)?.apiKey;
      if (hasSettings && backendToken) {
        navigate("/dashboard", { replace: true });
      } else {
        if (!backendToken) {
          notifications.show({
            title: "MIX ID авторизация завершена",
            message:
              "Вы вошли в MIX ID, но не в приложение. Пожалуйста, завершите вход в бэкенд.",
            color: "yellow",
          });
        }
        navigate("/settings", { replace: true });
      }
    } catch (error) {
      console.error("Error during MIX ID connect flow on AuthPage:", error);
      notifications.show({
        title: "Ошибка при инициализации",
        message:
          error instanceof Error
            ? error.message
            : "Не удалось автоматически подтянуть настройки из MIX ID. Вы можете настроить позже.",
        color: "orange",
      });
      navigate("/settings", { replace: true });
    }
  };

  return (
    <Page>
      <Container
        h="100vh"
        maw={1200}
        px={{ base: "md", sm: "lg", md: "xl" }}
        py="xl"
        style={{ position: "relative", zIndex: 1 }}
      >
        <Center h="100%">
          <Card shadow="md" padding="xl" radius="md" maw={480} w="100%">
            <Stack gap="md">
              {/* <MixIdConnection
                onConnected={handleConnected}
                onDisconnected={() => {
                  navigate('/auth', { replace: true })
                }}
                showSyncSettings={false}
                showSyncData={false}
                notifications={notifications}
              /> */}

              {/* Local email/password auth */}
              <LocalAuthForm />
              {/* If MIX ID is connected but backend token is missing, allow completing backend login */}
              {isConnected && !settings.backendToken && (
                <Button
                  onClick={async () => {
                    try {
                      const redirectUri =
                        typeof window !== "undefined"
                          ? window.location.origin + "/mixid-callback"
                          : undefined;
                      const { authorizationUrl, code: precode } =
                        await mixIdApi.initiateOAuth(redirectUri ?? "");

                      const width = 600;
                      const height = 700;
                      const left =
                        window.screenX + (window.outerWidth - width) / 2;
                      const top =
                        window.screenY + (window.outerHeight - height) / 2;
                      const oauthWindow = window.open(
                        authorizationUrl,
                        "MIX ID Authorization",
                        `width=${width},height=${height},left=${left},top=${top}`,
                      );

                      const handler = async (event: MessageEvent) => {
                        if (event.origin !== window.location.origin) return;
                        if (event.data.type === "mixid-oauth-callback") {
                          window.removeEventListener("message", handler);
                          oauthWindow?.close();
                          const callbackCode = event.data.code || precode;
                          try {
                            const defaultBackendUrl =
                              (import.meta.env.VITE_BACKEND_URL as string) ||
                              "https://kimai-api.zorin.cloud";
                            const backendUrl =
                              settings.backendUrl || defaultBackendUrl;
                            const backendApi = new BackendApi(
                              backendUrl.trim(),
                            );
                            const authResponse =
                              await backendApi.exchangeMixIdCode(
                                callbackCode,
                                redirectUri,
                              );
                            const backendToken = authResponse?.token || null;
                            backendApi.setToken(backendToken);
                            if (authResponse?.refresh_token) {
                              try {
                                localStorage.setItem(
                                  "backend_refresh_token",
                                  authResponse.refresh_token,
                                );
                              } catch (e) {
                                console.warn(e);
                              }
                            }
                            // update settings with backend token
                            updateSettings({
                              ...settings,
                              backendToken: backendToken || "",
                            });
                            notifications.show({
                              title: "Успешно",
                              message: "Вход в бэкенд завершён",
                              color: "green",
                            });
                            navigate("/dashboard", { replace: true });
                          } catch (e) {
                            console.warn("Backend exchange failed:", e);
                            notifications.show({
                              title: "Ошибка",
                              message: "Не удалось завершить вход в бэкенд",
                              color: "red",
                            });
                          }
                        }
                      };

                      window.addEventListener("message", handler);
                    } catch (e) {
                      console.warn("Could not initiate backend auth:", e);
                      notifications.show({
                        title: "Ошибка",
                        message: "Не удалось инициировать вход в бэкенд",
                        color: "red",
                      });
                    }
                  }}
                >
                  Завершить вход в бэкенд
                </Button>
              )}
            </Stack>
          </Card>
        </Center>
      </Container>
    </Page>
  );
}

export default AuthPage;
