/**
 * Router Configuration
 * 
 * Конфигурация маршрутов приложения с использованием React Router.
 * Включает lazy loading для оптимизации bundle size.
 */

import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider } from "react-router-dom"
import { ErrorBoundary, ErrorBoundaryProps } from 'react-error-boundary'
import { Outlet } from 'react-router-dom'
import { FC, lazy } from 'react'
import { AuthGuard, SetupGuard } from './guards'
import { InitialRedirect, ErrorPage } from './components'

// Lazy load pages for code splitting
const SettingsPage = lazy(() => import("@/pages/SettingsPage"))
const AuthPage = lazy(() => import("@/pages/AuthPage"))
const SetupPage = lazy(() => import("@/pages/SetupPage"))
const DashboardPage = lazy(() => import("@/pages/DashboardPage"))
const TimesheetPage = lazy(() => import("@/pages/TimesheetPage"))
const FinancialPage = lazy(() => import("@/pages/FinancialPage"))
const PaymentHistoryPage = lazy(() => import("@/pages/PaymentHistoryPage"))
const StatisticsPage = lazy(() => import("@/pages/StatisticsPage"))
const CalendarPage = lazy(() => import("@/pages/CalendarPage"))
const TimeAnalysisPage = lazy(() => import("@/pages/TimeAnalysisPage"))
const MLInsightsPage = lazy(() => import("@/pages/MLInsightsPage"))
const OAuthCallbackPage = lazy(() => import("@/pages/OAuthCallbackPage"))
const MixIdCallbackPage = lazy(() => import("@localzet/data-connector/components").then(m => ({ default: m.MixIdCallbackPage })))
const MainLayout = lazy(() => import("@/widgets/layout").then(module => ({ default: module.MainLayout })))

/**
 * ErrorBoundaryHoc
 * 
 * HOC для оборачивания маршрутов в ErrorBoundary
 */
export const ErrorBoundaryHoc: FC<ErrorBoundaryProps> = (props) => {
    return (
        <ErrorBoundary {...props}>
            <Outlet />
        </ErrorBoundary>
    )
}

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route element={<ErrorBoundaryHoc fallback={<ErrorPage />} />}>
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

