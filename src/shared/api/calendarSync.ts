import { Timesheet } from "./kimaiApi";
import dayjs from "dayjs";
import { CalendarSyncSettings } from "../hooks/useSettings";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  color?: string;
  location?: string;
}

export class GoogleCalendarSync {
  private settings: CalendarSyncSettings;

  constructor(settings: CalendarSyncSettings) {
    this.settings = settings;
  }

  /**
   * Инициирует OAuth авторизацию Google Calendar
   */
  async authorize(): Promise<{ accessToken: string; refreshToken: string }> {
    if (!this.settings.googleClientId || !this.settings.googleClientSecret) {
      throw new Error("Google Client ID и Client Secret должны быть настроены");
    }

    // Сохраняем credentials во временное хранилище для callback страницы
    localStorage.setItem("google-client-id", this.settings.googleClientId);
    localStorage.setItem(
      "google-client-secret",
      this.settings.googleClientSecret,
    );

    const redirectUri = `${window.location.origin}/oauth/callback`;

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(this.settings.googleClientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent("https://www.googleapis.com/auth/calendar.events")}&` +
      `access_type=offline&` +
      `prompt=consent`;

    // Открываем окно авторизации
    const authWindow = window.open(
      authUrl,
      "Google Calendar Authorization",
      "width=500,height=600",
    );

    return new Promise((resolve, reject) => {
      const checkClosed = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", messageHandler);
          reject(new Error("Авторизация отменена"));
        }
      }, 1000);

      // Слушаем сообщения от окна авторизации
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === "GOOGLE_AUTH_SUCCESS") {
          clearInterval(checkClosed);
          window.removeEventListener("message", messageHandler);
          authWindow?.close();
          // Очищаем временные данные
          localStorage.removeItem("google-client-id");
          localStorage.removeItem("google-client-secret");
          resolve({
            accessToken: event.data.accessToken,
            refreshToken: event.data.refreshToken,
          });
        } else if (event.data.type === "GOOGLE_AUTH_ERROR") {
          clearInterval(checkClosed);
          window.removeEventListener("message", messageHandler);
          authWindow?.close();
          // Очищаем временные данные
          localStorage.removeItem("google-client-id");
          localStorage.removeItem("google-client-secret");
          reject(new Error(event.data.error || "Ошибка авторизации"));
        }
      };

      window.addEventListener("message", messageHandler);
    });
  }

  /**
   * Обновляет access token используя refresh token
   */
  async refreshAccessToken(): Promise<string> {
    if (
      !this.settings.googleRefreshToken ||
      !this.settings.googleClientId ||
      !this.settings.googleClientSecret
    ) {
      throw new Error("Не настроены учетные данные Google");
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.settings.googleClientId,
        client_secret: this.settings.googleClientSecret,
        refresh_token: this.settings.googleRefreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      throw new Error("Не удалось обновить токен доступа");
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Получает действительный access token
   */
  async getValidAccessToken(): Promise<string> {
    if (!this.settings.googleAccessToken) {
      throw new Error("Access token не настроен");
    }

    // Проверяем, не истек ли токен (упрощенная проверка)
    // В реальном приложении нужно проверять время истечения
    try {
      return await this.refreshAccessToken();
    } catch {
      return this.settings.googleAccessToken;
    }
  }

  /**
   * Синхронизирует события в Google Calendar
   */
  async syncEvents(
    entries: Timesheet[],
  ): Promise<{ created: number; updated: number; errors: number }> {
    const calendarId = this.settings.googleCalendarId || "primary";
    const accessToken = await this.getValidAccessToken();

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const entry of entries) {
      try {
        const event = this.timesheetToCalendarEvent(entry);
        await this.createOrUpdateEvent(
          calendarId,
          accessToken,
          event,
          entry.id,
        );
        created++;
      } catch (error) {
        console.error(`Ошибка синхронизации записи ${entry.id}:`, error);
        errors++;
      }
    }

    return { created, updated, errors };
  }

  /**
   * Преобразует запись времени в событие календаря
   */
  private timesheetToCalendarEvent(entry: Timesheet): CalendarEvent {
    const project = typeof entry.project === "object" ? entry.project : null;
    const activity = typeof entry.activity === "object" ? entry.activity : null;
    const projectName = project?.name || "Без проекта";
    const activityName = activity?.name || "Без задачи";

    const start = dayjs(entry.begin);
    const end = entry.end ? dayjs(entry.end) : dayjs();

    return {
      id: `kimai-${entry.id}`,
      title: `${projectName}${activityName !== "Без задачи" ? ` - ${activityName}` : ""}`,
      description: entry.description || `Работа над проектом ${projectName}`,
      start: start.toDate(),
      end: end.toDate(),
    };
  }

  /**
   * Создает или обновляет событие в календаре
   */
  private async createOrUpdateEvent(
    calendarId: string,
    accessToken: string,
    event: CalendarEvent,
    timesheetId: number,
  ): Promise<void> {
    const eventId = `kimai-${timesheetId}`;
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`;

    // Пытаемся обновить существующее событие
    const updateResponse = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        extendedProperties: {
          private: {
            kimaiId: String(timesheetId),
          },
        },
      }),
    });

    // Если событие не существует, создаем новое
    if (updateResponse.status === 404) {
      const createUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
      const createResponse = await fetch(createUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: eventId,
          summary: event.title,
          description: event.description,
          start: {
            dateTime: event.start.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: event.end.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          extendedProperties: {
            private: {
              kimaiId: String(timesheetId),
            },
          },
        }),
      });

      if (!createResponse.ok) {
        throw new Error(
          `Ошибка создания события: ${createResponse.statusText}`,
        );
      }
    } else if (!updateResponse.ok) {
      throw new Error(
        `Ошибка обновления события: ${updateResponse.statusText}`,
      );
    }
  }
}

// Проверка доступности Electron
// Используем несколько способов проверки для надежности
function isElectronEnvironment(): boolean {
  if (typeof window === "undefined") return false;

  // Способ 1: Проверка через contextBridge
  if (window.electron?.isElectron) return true;

  // Способ 2: Проверка через userAgent (Electron добавляет свой userAgent)
  if (
    typeof navigator !== "undefined" &&
    navigator.userAgent.includes("Electron")
  ) {
    return true;
  }

  // Способ 3: Проверка наличия process.versions.electron
  // (но это работает только если nodeIntegration включен, что у нас не так)

  return false;
}

const isElectron = isElectronEnvironment();

// Универсальная функция для запросов к Notion API
async function notionFetch(
  url: string,
  options: RequestInit,
): Promise<Response> {
  const electronAvailable =
    isElectronEnvironment() && window.electron?.notionApi;

  if (electronAvailable && window.electron?.notionApi) {
    // Используем Electron IPC для обхода CORS
    console.log("Using Electron IPC for Notion API request");
    const result = await window.electron.notionApi.request(url, options);

    if (!result.ok) {
      throw new Error(
        result.error || `HTTP ${result.status}: ${result.statusText}`,
      );
    }

    // Создаем Response-подобный объект
    return {
      ok: result.ok,
      status: result.status,
      statusText: result.statusText,
      json: async () => result.data,
      text: async () => JSON.stringify(result.data),
    } as Response;
  } else {
    // В браузере используем обычный fetch (будет ошибка CORS)
    console.warn(
      "Notion API: Using browser fetch (CORS may fail). Electron IPC not available.",
    );
    return fetch(url, options);
  }
}

export class NotionCalendarSync {
  private settings: CalendarSyncSettings;

  constructor(settings: CalendarSyncSettings) {
    this.settings = settings;
  }

  /**
   * Синхронизирует события в Notion Calendar через Notion API
   */
  async syncEvents(
    entries: Timesheet[],
  ): Promise<{ created: number; updated: number; errors: number }> {
    if (!this.settings.notionApiKey || !this.settings.notionDatabaseId) {
      throw new Error("Notion API ключ или Database ID не настроены");
    }

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const entry of entries) {
      try {
        const wasUpdated = await this.createOrUpdatePage(entry);
        if (wasUpdated) {
          updated++;
        } else {
          created++;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`Ошибка синхронизации записи ${entry.id}:`, errorMessage);

        // Если это критическая ошибка (например, база данных не найдена), останавливаем синхронизацию
        if (
          errorMessage.includes("База данных не найдена") ||
          errorMessage.includes("Database ID")
        ) {
          throw error;
        }

        errors++;
      }
    }

    return { created, updated, errors };
  }

  /**
   * Создает или обновляет страницу в Notion
   * @returns true если страница была обновлена, false если создана
   */
  private async createOrUpdatePage(entry: Timesheet): Promise<boolean> {
    const project = typeof entry.project === "object" ? entry.project : null;
    const activity = typeof entry.activity === "object" ? entry.activity : null;
    const projectName = project?.name || "Без проекта";
    const activityName = activity?.name || "Без задачи";

    const start = dayjs(entry.begin);
    const end = entry.end ? dayjs(entry.end) : dayjs();
    const duration = end.diff(start, "minute");
    const projectTemplates = this.settings.notionProjectTemplates || {};

    // Ищем существующую страницу по Kimai ID
    const existingPage = await this.findPageByKimaiId(entry.id);

    const pageData: any = {
      template: {
        type: projectTemplates[projectName] ? "template_id" : "default",
        template_id: projectTemplates[projectName] || undefined,
      },
      parent: {
        database_id: this.settings.notionDatabaseId!,
      },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: `${entry.description ? `${entry.description}` : `${projectName}`}`,
              },
            },
          ],
        },
        Date: {
          date: entry.begin
            ? {
                start: start.toISOString(),
                end: end.toISOString(),
              }
            : null,
        },
        Duration: {
          number: duration,
        },
        Project: {
          select: {
            name: projectName,
          },
        },
        Activity: {
          rich_text: [
            {
              text: {
                content: activityName,
              },
            },
          ],
        },
        "Kimai ID": {
          number: entry.id,
        },
        Tags: {
          multi_select: entry.tags?.map((t) => ({
            name: t,
          })),
        },
      },
    };
    if (existingPage) {
      // Обновляем существующую страницу
      const updateResponse = await notionFetch(
        `https://api.notion.com/v1/pages/${existingPage.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${this.settings.notionApiKey}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
          },
          body: JSON.stringify({
            properties: pageData.properties,
            template: pageData.template,
          }),
        },
      );

      if (!updateResponse.ok) {
        let errorText = "Unknown error";
        try {
          const errorData = await updateResponse.json();
          errorText = errorData.message || JSON.stringify(errorData);
        } catch {
          try {
            errorText = await updateResponse.text();
          } catch {
            errorText = updateResponse.statusText;
          }
        }
        throw new Error(
          `Ошибка обновления страницы (HTTP ${updateResponse.status}): ${errorText}`,
        );
      }

      return true;
    } else {
      // Создаем новую страницу
      const createResponse = await notionFetch(
        "https://api.notion.com/v1/pages",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.settings.notionApiKey}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
          },
          body: JSON.stringify(pageData),
        },
      );

      if (!createResponse.ok) {
        let errorText = "Unknown error";
        try {
          const errorData = await createResponse.json();
          errorText = errorData.message || JSON.stringify(errorData);

          // Специальная обработка для 404 - возможно неправильный Database ID
          if (createResponse.status === 404) {
            errorText = `База данных не найдена. Проверьте Database ID: ${this.settings.notionDatabaseId}. Убедитесь, что интеграция имеет доступ к базе данных.`;
          }
        } catch {
          try {
            errorText = await createResponse.text();
          } catch {
            errorText = createResponse.statusText;
          }
        }
        throw new Error(
          `Ошибка создания страницы (HTTP ${createResponse.status}): ${errorText}`,
        );
      }

      return false;
    }
  }

  /**
   * Ищет страницу в Notion по Kimai ID
   */
  private async findPageByKimaiId(
    kimaiId: number,
  ): Promise<{ id: string } | null> {
    try {
      const response = await notionFetch(
        `https://api.notion.com/v1/databases/${this.settings.notionDatabaseId}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.settings.notionApiKey}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
          },
          body: JSON.stringify({
            filter: {
              property: "Kimai ID",
              number: {
                equals: kimaiId,
              },
            },
          }),
        },
      );

      if (!response.ok) {
        // Если 404 - база данных не найдена, это критическая ошибка
        if (response.status === 404) {
          throw new Error(
            `База данных не найдена (HTTP 404). Проверьте Database ID: ${this.settings.notionDatabaseId}. Убедитесь, что интеграция имеет доступ к базе данных.`,
          );
        }
        console.warn(
          "Ошибка поиска страницы в Notion:",
          response.status,
          response.statusText,
        );
        return null;
      }

      const data = await response.json();
      return data.results.length > 0 ? { id: data.results[0].id } : null;
    } catch (error) {
      // Если это ошибка о базе данных - пробрасываем дальше
      if (
        error instanceof Error &&
        error.message.includes("База данных не найдена")
      ) {
        throw error;
      }
      console.error("Ошибка поиска страницы в Notion:", error);
      return null;
    }
  }
}

/**
 * Главная функция синхронизации календаря
 */
export async function syncCalendar(
  entries: Timesheet[],
  settings: CalendarSyncSettings,
): Promise<{ created: number; updated: number; errors: number }> {
  if (!settings.enabled || !settings.syncType) {
    throw new Error("Синхронизация календаря не настроена");
  }

  if (settings.syncType === "google") {
    const sync = new GoogleCalendarSync(settings);
    return sync.syncEvents(entries);
  } else if (settings.syncType === "notion") {
    const sync = new NotionCalendarSync(settings);
    return sync.syncEvents(entries);
  } else {
    throw new Error(`Неподдерживаемый тип синхронизации: ${settings.syncType}`);
  }
}
