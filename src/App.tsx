/**
 * App Entry Point
 *
 * Главный компонент приложения.
 * Импортирует стили и инициализирует провайдеры и роутер.
 */

// Mantine styles
import "@mantine/charts/styles.css";
import "@mantine/core/styles.css";
import "@mantine/core/styles.layer.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/nprogress/styles.css";

// Third-party styles
import "mantine-react-table/styles.css";
import "@gfazioli/mantine-list-view-table/styles.css";
import "@gfazioli/mantine-split-pane/styles.css";
import "@gfazioli/mantine-spinner/styles.css";

// Global styles
import "./global.css";

import { Router } from "@/app/router";
import { useMediaQuery } from "@mantine/hooks";
import { Suspense, useEffect } from "react";
import {
  Center,
  DirectionProvider,
  MantineProvider,
  Progress,
  Stack,
} from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { NavigationProgress } from "@mantine/nprogress";
import { theme } from "./theme";
import { AuthProvider } from "./app/router/components/AuthProvider";

export function App() {
  const mq = useMediaQuery("(min-width: 40em)");

  useEffect(() => {
    const root = document.getElementById("root");
    if (root) {
      const bottomBar = document.createElement("div");
      bottomBar.className = "safe-area-bottom";
      root.appendChild(bottomBar);
    }
  }, []);

  return (
    <AuthProvider>
      <DirectionProvider>
        <MantineProvider defaultColorScheme="dark" theme={theme}>
          <ModalsProvider>
            <Notifications position={mq ? "top-right" : "bottom-right"} />
            <NavigationProgress />

            <Suspense
              fallback={
                <Center h="100%">
                  <Center
                    style={{
                      height: `calc(60vh - var(--app-shell-header-height) - 20px)`,
                    }}
                  >
                    <Stack align="center" gap="xs" w="100%">
                      <Progress
                        animated
                        color="cyan"
                        maw="32rem"
                        radius="xs"
                        striped
                        value={100}
                        w="80%"
                      />
                    </Stack>
                  </Center>
                </Center>
              }
            >
              <Router />
            </Suspense>
          </ModalsProvider>
        </MantineProvider>
      </DirectionProvider>
    </AuthProvider>
  );
}

export default App;
