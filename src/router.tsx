import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider, useNavigate } from "react-router-dom"
import { ErrorBoundary, ErrorBoundaryProps } from 'react-error-boundary'
import { Outlet } from 'react-router-dom'
import { FC, lazy } from 'react'
import { Button, Container, Group, Title, Text } from "@mantine/core"
import { SetupGuard } from "./components/SetupGuard"
import { InitialRedirect } from "./components/InitialRedirect"
import { AuthGuard } from "./components/AuthGuard"

const SettingsPage = lazy(() => import("./pages/SettingsPage"))
const AuthPage = lazy(() => import("./pages/AuthPage"))
const SetupPage = lazy(() => import("./pages/SetupPage"))
const DashboardPage = lazy(() => import("./pages/DashboardPage"))
const TimesheetPage = lazy(() => import("./pages/TimesheetPage"))
const FinancialPage = lazy(() => import("./pages/FinancialPage"))
const PaymentHistoryPage = lazy(() => import("./pages/PaymentHistoryPage"))
const StatisticsPage = lazy(() => import("./pages/StatisticsPage"))
const CalendarPage = lazy(() => import("./pages/CalendarPage"))
const TimeAnalysisPage = lazy(() => import("./pages/TimeAnalysisPage"))
const MLInsightsPage = lazy(() => import("./pages/MLInsightsPage"))
const OAuthCallbackPage = lazy(() => import("./pages/OAuthCallbackPage"))
const MixIdCallbackPage = lazy(() => import("@localzet/data-connector/components").then(m => ({ default: m.MixIdCallbackPage })))
const MainLayout = lazy(() => import("./layout").then(module => ({ default: module.MainLayout })))

import classesError from './error.module.css'

export const ErrorBoundaryHoc: FC<ErrorBoundaryProps> = (props) => {
    return (
        <ErrorBoundary {...props}>
            <Outlet />
        </ErrorBoundary>
    )
}

export function ErrorPageComponent() {
    const navigate = useNavigate()

    const handleRefresh = () => {
        navigate(0)
    }

    return (
        <div className={classesError.root}>
            <Container>
                <div className={classesError.label}>500</div>
                <Title className={classesError.title}>Something bad just happened...</Title>
                <Text className={classesError.description} size="lg" ta="center">
                    Try to refresh the page.
                </Text>
                <Group justify="center">
                    <Button onClick={handleRefresh} size="md" variant="outline">
                        Refresh the page
                    </Button>
                </Group>
            </Container>
        </div>
    )
}
const router = createBrowserRouter(
    createRoutesFromElements(
        <Route element={<ErrorBoundaryHoc fallback={<ErrorPageComponent />} />}>
            <Route
                element={<AuthPage />}
                path='/auth'
            />
            <Route
                element={<SetupPage />}
                path='/setup'
            />
            <Route
                element={<MixIdCallbackPage />}
                path='/mixid-callback'
            />
            <Route
                element={<OAuthCallbackPage />}
                path='/oauth/callback'
            />
            <Route element={<AuthGuard><MainLayout /></AuthGuard>} path='/'>
                <Route element={<InitialRedirect />} index path='/' />
                <Route
                    element={<SettingsPage />}
                    path='/settings'
                />
                <Route
                    element={
                        <SetupGuard>
                            <DashboardPage />
                        </SetupGuard>
                    }
                    path='/dashboard'
                />

                <Route
                    element={
                        <SetupGuard>
                            <TimesheetPage />
                        </SetupGuard>
                    }
                    path='/timesheet'
                />

                <Route
                    element={
                        <SetupGuard>
                            <FinancialPage />
                        </SetupGuard>
                    }
                    path='/financial'
                />

                <Route
                    element={
                        <SetupGuard>
                            <PaymentHistoryPage />
                        </SetupGuard>
                    }
                    path='/payment-history'
                />

                <Route
                    element={
                        <SetupGuard>
                            <StatisticsPage />
                        </SetupGuard>
                    }
                    path='/statistics'
                />

                <Route
                    element={
                        <SetupGuard>
                            <CalendarPage />
                        </SetupGuard>
                    }
                    path='/calendar'
                />

                <Route
                    element={
                        <SetupGuard>
                            <TimeAnalysisPage />
                        </SetupGuard>
                    }
                    path='/time-analysis'
                />

                <Route
                    element={
                        <SetupGuard>
                            <MLInsightsPage />
                        </SetupGuard>
                    }
                    path='/ml-insights'
                />

            </Route>
            {/* Catch-all route for unknown URLs (file:// protocol paths, etc) */}
            <Route path="*" element={<Navigate replace to="/" />} />
        </Route>
    )
)

export function Router() {
    return <RouterProvider router={router} />
}
