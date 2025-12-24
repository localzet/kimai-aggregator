/**
 * MainLayout
 *
 * Главный layout компонент приложения.
 * Содержит AppShell с хедером, сайдбаром и основным контентом.
 */

import {
  AppShell,
  Box,
  Burger,
  Container,
  Divider,
  Group,
  Stack,
  Title,
  Text,
  ScrollArea,
  NavLink,
} from "@mantine/core";
import {
  useClickOutside,
  useDisclosure,
  useHeadroom,
  useMediaQuery,
} from "@mantine/hooks";
import { useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import RouterLink from "@/shared/ui/RouterLink";
import { PiArrowRight } from "react-icons/pi";
import { useSettings } from "@/shared/hooks/useSettings";
import { useMixIdStatus } from "@/shared/useMixIdStub";
import { useUnifiedSync } from "@/shared/hooks/useUnifiedSync";
import clsx from "clsx";
import {
  HeaderStatusIndicator,
  NotificationsButton,
  LogoutButton,
} from "@/widgets/header";
import { useNavigationMenu } from "@/widgets/sidebar";
import classes from "@/app/AppShell.module.css";
import classesSidebar from "@/sidebar.module.css";
import classesNavigation from "@/navigation.module.css";

export function MainLayout() {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const pinned = useHeadroom({ fixedAt: 120 });
  const navigate = useNavigate();

  const isMobile = useMediaQuery(`(max-width: 64rem)`, undefined, {
    getInitialValueInEffect: false,
  });

  const ref = useClickOutside(() => {
    if (isMobile && mobileOpened) {
      toggleMobile();
    }
  });

  useEffect(() => {
    const root = document.getElementById("root");
    if (root) {
      const bottomBar = document.createElement("div");
      bottomBar.className = "safe-area-bottom";
      root.appendChild(bottomBar);
    }
  }, []);

  const { settings } = useSettings();
  const { pathname } = useLocation();
  const mixIdStatus = useMixIdStatus();
  const { performSync } = useUnifiedSync();
  const prevPathnameRef = useRef<string>(pathname);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menu = useNavigationMenu();

  // Если нет настроек и мы не на странице настроек, редиректим на страницу настроек
  useEffect(() => {
    const appMode = settings.appMode ?? "normal";
    if (
      appMode === "normal" &&
      !settings.apiUrl &&
      !settings.apiKey &&
      pathname !== "/settings"
    ) {
      navigate("/settings", { replace: true });
    }
  }, [settings, pathname, navigate]);

  // Триггер синхронизации при переходе по страницам с дебаунсингом
  useEffect(() => {
    if (
      prevPathnameRef.current !== pathname &&
      prevPathnameRef.current !== "/"
    ) {
      // Очищаем предыдущий таймер, если он есть
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Дебаунсинг: запускаем синхронизацию через 1 секунду после последнего изменения страницы
      syncTimeoutRef.current = setTimeout(() => {
        performSync("page-change");
      }, 1000);
    }
    prevPathnameRef.current = pathname;

    // Очистка таймера при размонтировании
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [pathname, performSync]);

  return (
    <AppShell
      className={isMobile ? undefined : classes.appShellFadeIn}
      header={{
        height: 64,
        collapsed: isMobile ? false : !pinned,
        offset: false,
      }}
      layout="alt"
      navbar={{
        width: 300,
        breakpoint: "lg",
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding={isMobile ? "md" : "xl"}
      transitionDuration={500}
      transitionTimingFunction="ease-in-out"
    >
      <AppShell.Header className={classes.header} withBorder={false}>
        <Container fluid px="lg" py="xs">
          <Group justify="space-between" style={{ flexWrap: "nowrap" }}>
            <Group style={{ flex: 1, justifyContent: "flex-start" }}>
              <Burger
                onClick={isMobile ? toggleMobile : toggleDesktop}
                opened={isMobile ? mobileOpened : desktopOpened}
                size="md"
              />
            </Group>
            <Group style={{ flexShrink: 0 }} gap="xs">
              <HeaderStatusIndicator />
              {mixIdStatus.isConnected && <NotificationsButton />}
              {mixIdStatus.isConnected && <LogoutButton />}
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Navbar
        className={clsx(classes.sidebarWrapper, {
          [classes.sidebarWrapperClosedDesktop]: !isMobile && !desktopOpened,
          [classes.sidebarWrapperClosedMobile]: isMobile && !mobileOpened,
        })}
        p="md"
        pb={0}
        ref={ref}
        w={300}
        withBorder={false}
      >
        <AppShell.Section className={classes.logoSection}>
          <Box style={{ position: "absolute", left: "0" }}>
            <Burger
              hiddenFrom="lg"
              onClick={isMobile ? toggleMobile : toggleDesktop}
              opened={isMobile ? mobileOpened : desktopOpened}
              size="sm"
            />
          </Box>

          <Group gap="xs" justify="center" wrap="nowrap">
            <Text className={classesSidebar.logoTitle}>
              <Text c={"cyan"} component="span" inherit mr={5}>
                Kimai
              </Text>
              <Text c={"white"} component="span" inherit>
                Aggrerator
              </Text>
            </Text>
          </Group>
        </AppShell.Section>

        <AppShell.Section
          className={classes.scrollArea}
          component={ScrollArea}
          flex={1}
          scrollbarSize="0.2rem"
        >
          <Stack gap="md" pb="md" pt="md">
            {menu.map((item, index) => (
              <Box key={item.id}>
                {index > 0 && (
                  <Divider
                    color="cyan.4"
                    mb="lg"
                    opacity={0.3}
                    variant="dashed"
                  />
                )}
                <Title className={classesNavigation.sectionTitle} order={6}>
                  {item.header}
                </Title>

                <Stack gap={1}>
                  {item.section.map((subItem) =>
                    subItem.dropdownItems ? (
                      <NavLink
                        active={false}
                        childrenOffset={0}
                        className={classesNavigation.sectionLink}
                        key={subItem.id}
                        label={subItem.name}
                        leftSection={subItem.icon && <subItem.icon />}
                        variant="light"
                      >
                        {subItem.dropdownItems?.map((dropdownItem) => (
                          <NavLink
                            active={pathname.includes(dropdownItem.href)}
                            className={
                              classesNavigation.sectionDropdownItemLink
                            }
                            component={RouterLink}
                            key={dropdownItem.id}
                            label={dropdownItem.name}
                            leftSection={
                              dropdownItem.icon ? (
                                <dropdownItem.icon />
                              ) : (
                                <PiArrowRight />
                              )
                            }
                            onClick={isMobile ? toggleMobile : undefined}
                            to={dropdownItem.href}
                            variant="subtle"
                          />
                        ))}
                      </NavLink>
                    ) : (
                      <NavLink
                        active={pathname === subItem.href}
                        className={classesNavigation.sectionLink}
                        component={RouterLink}
                        key={subItem.id}
                        label={subItem.name}
                        leftSection={subItem.icon && <subItem.icon />}
                        onClick={isMobile ? toggleMobile : undefined}
                        to={subItem.href}
                        variant="subtle"
                        {...(subItem.newTab
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                      />
                    ),
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main
        pb="var(--mantine-spacing-md)"
        pt="calc(var(--app-shell-header-height) + 10px)"
      >
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
