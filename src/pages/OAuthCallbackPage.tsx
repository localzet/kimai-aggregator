import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Container, Text, Loader, Stack } from "@mantine/core";

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  useEffect(() => {
    if (error) {
      // Отправляем сообщение об ошибке родительскому окну
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "GOOGLE_AUTH_ERROR",
            error: error,
          },
          window.location.origin,
        );
      }
      window.close();
      return;
    }

    if (code) {
      // Обмениваем код на токены
      // В реальном приложении это должно делаться на сервере
      // Здесь мы используем упрощенный подход для демонстрации
      const clientId = localStorage.getItem("google-client-id");
      const clientSecret = localStorage.getItem("google-client-secret");
      const redirectUri = `${window.location.origin}/oauth/callback`;

      if (!clientId || !clientSecret) {
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "GOOGLE_AUTH_ERROR",
              error: "Client ID или Client Secret не найдены",
            },
            window.location.origin,
          );
        }
        window.close();
        return;
      }

      // Обмениваем код на токены
      fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            throw new Error(data.error_description || data.error);
          }

          // Отправляем токены родительскому окну
          if (window.opener) {
            window.opener.postMessage(
              {
                type: "GOOGLE_AUTH_SUCCESS",
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
              },
              window.location.origin,
            );
          }
          window.close();
        })
        .catch((err) => {
          if (window.opener) {
            window.opener.postMessage(
              {
                type: "GOOGLE_AUTH_ERROR",
                error: err.message || "Ошибка обмена кода на токены",
              },
              window.location.origin,
            );
          }
          window.close();
        });
    }
  }, [code, error]);

  return (
    <Container>
      <Stack align="center" gap="md" mt="xl">
        <Loader size="lg" />
        <Text>Обработка авторизации...</Text>
      </Stack>
    </Container>
  );
}
