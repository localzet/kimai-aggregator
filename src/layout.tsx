import { AppShell, Box, Burger, Container, Divider, Group, Stack, Title, Text, ScrollArea, NavLink } from "@mantine/core"
import { useClickOutside, useDisclosure, useHeadroom, useMediaQuery } from "@mantine/hooks"
import { ElementType, useEffect, useState } from "react"

import { NavLink as RouterLink, Outlet, useLocation } from "react-router-dom"
import { PiArrowRight, PiCpu, PiListChecks, PiStarDuotone } from "react-icons/pi"
import {
    TbDeviceAnalytics,
    TbReportAnalytics,
} from 'react-icons/tb'
import { HiCurrencyDollar } from 'react-icons/hi'

import { useSettings } from "./hooks/useSettings"
import clsx from 'clsx'

import classes from './app/AppShell.module.css'
import classesSidebar from './sidebar.module.css'
import classesNavigation from './navigation.module.css'

export interface MenuItem {
    header?: string
    id?: string
    section: {
        dropdownItems?: {
            href: string
            icon?: ElementType
            id: string
            name: string
        }[]
        href: string
        icon: ElementType
        id: string
        name: string
        newTab?: boolean
    }[]
}

export function MainLayout() {
    const [mobileOpened, { toggle: toggleMobile }] = useDisclosure()
    const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true)
    const [isMediaQueryReady, setIsMediaQueryReady] = useState(false)
    const pinned = useHeadroom({ fixedAt: 120 })

    const isMobile = useMediaQuery(`(max-width: 64rem)`, undefined, {
        getInitialValueInEffect: false
    })
    const isSocialButton = useMediaQuery(`(max-width: 40rem)`, undefined, {
        getInitialValueInEffect: false
    })

    useEffect(() => {
        setIsMediaQueryReady(true)
    }, [isMobile, isSocialButton])

    const ref = useClickOutside(() => {
        if (isMobile && mobileOpened) {
            toggleMobile()
        }
    })

    const mq = useMediaQuery('(min-width: 40em)')

    useEffect(() => {
        const root = document.getElementById('root')
        if (root) {
            const bottomBar = document.createElement('div')
            bottomBar.className = 'safe-area-bottom'
            root.appendChild(bottomBar)
        }
    }, [])

    const { settings } = useSettings()
    const { pathname } = useLocation()
    const [showFullMenu, setShowFullMenu] = useState(false)

    useEffect(() => {
        setShowFullMenu(!!(settings.apiUrl && settings.apiKey))
    }, [settings])

    const menu: MenuItem[] = []
    if (showFullMenu) {
        menu.unshift({
            id: 'main',
            header: 'Меню',
            section: [
                {
                    id: 'dashboard',
                    href: '/dashboard',
                    name: 'Главная',
                    icon: PiStarDuotone,
                },
                {
                    id: 'timesheet',
                    href: '/timesheet',
                    name: 'Таблица времени',
                    icon: PiListChecks,
                },
                {
                    id: 'financial',
                    href: '/financial',
                    name: 'Финансы',
                    icon: HiCurrencyDollar,
                },
                {
                    id: 'payment-history',
                    href: '/payment-history',
                    name: 'История оплат',
                    icon: TbReportAnalytics,
                },
                {
                    id: 'statistics',
                    href: '/statistics',
                    name: 'Статистика',
                    icon: TbDeviceAnalytics,
                },
            ]
        })
    }

    menu.push({
        id: 'main-settings',
        header: 'Параметры',
        section: [
            {
                id: 'settings',
                href: '/settings',
                name: 'Настройки',
                icon: PiCpu,
            },
        ]
    })

    if (!isMediaQueryReady) {
        return <div style={{ height: '100vh' }}></div>
    }

    return (
        <AppShell
            className={isMobile ? undefined : classes.appShellFadeIn}
            header={{ height: 64, collapsed: isMobile ? false : !pinned, offset: false }}
            layout="alt"
            navbar={{
                width: 300,
                breakpoint: 'lg',
                collapsed: { mobile: !mobileOpened, desktop: !desktopOpened }
            }}
            padding={isMobile ? 'md' : 'xl'}
            transitionDuration={500}
            transitionTimingFunction="ease-in-out"
        >
            <AppShell.Header className={classes.header} withBorder={false}>
                <Container fluid px="lg" py="xs">
                    <Group justify="space-between" style={{ flexWrap: 'nowrap' }}>
                        <Group style={{ flex: 1, justifyContent: 'flex-start' }}>
                            <Burger
                                onClick={isMobile ? toggleMobile : toggleDesktop}
                                opened={isMobile ? mobileOpened : desktopOpened}
                                size="md"
                            />
                        </Group>
                        <Group style={{ flexShrink: 0 }}>
                            {/* <HeaderControls
                                githubLink="https://github.com/remnawave/panel"
                                isGithubLoading={isLoadingUpdates}
                                stars={remnawaveInfo.starsCount || undefined}
                                telegramLink="https://t.me/remnawave"
                                withGithub={!isSocialButton}
                                withSupport={!isSocialButton}
                                withTelegram={!isSocialButton}
                            /> */}
                        </Group>
                    </Group>
                </Container>
            </AppShell.Header>

            <AppShell.Navbar
                className={clsx(classes.sidebarWrapper, {
                    [classes.sidebarWrapperClosedDesktop]: !isMobile && !desktopOpened,
                    [classes.sidebarWrapperClosedMobile]: isMobile && !mobileOpened
                })}
                p="md"
                pb={0}
                ref={ref}
                w={300}
                withBorder={false}
            >
                <AppShell.Section className={classes.logoSection}>
                    <Box style={{ position: 'absolute', left: '0' }}>
                        <Burger
                            hiddenFrom="lg"
                            onClick={isMobile ? toggleMobile : toggleDesktop}
                            opened={isMobile ? mobileOpened : desktopOpened}
                            size="sm"
                        />
                    </Box>

                    <Group gap="xs" justify="center" wrap="nowrap">
                        <Text className={classesSidebar.logoTitle}>
                            <Text c={'cyan'} component="span" inherit mr={5}>
                                Kimai
                            </Text>
                            <Text c={'white'} component="span" inherit>
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
                                {index > 0 && <Divider color="cyan.4" mb="lg" opacity={0.3} variant="dashed" />}
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
                                                        className={classesNavigation.sectionDropdownItemLink}
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
                                                    ? { target: '_blank', rel: 'noopener noreferrer' }
                                                    : {})}
                                            />
                                        )
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
    )
}