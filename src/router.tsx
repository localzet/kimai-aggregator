import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider, useNavigate } from "react-router-dom"
import { ErrorBoundary, ErrorBoundaryProps } from 'react-error-boundary'
import { Outlet } from 'react-router-dom'
import { FC } from 'react'
import { Button, Container, Group, Title, Text } from "@mantine/core"

import SettingsPage from "./pages/SettingsPage"
import DashboardPage from "./pages/DashboardPage"
import TimesheetPage from "./pages/TimesheetPage"
import FinancialPage from "./pages/FinancialPage"
import PaymentHistoryPage from "./pages/PaymentHistoryPage"
import StatisticsPage from "./pages/StatisticsPage"
import { MainLayout } from "./layout"

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
            <Route element={<MainLayout />} path='/'>
                <Route
                    element={<SettingsPage />}
                    path='/settings'
                />
                <Route
                    element={<DashboardPage />}
                    path='/dashboard'
                />

                <Route
                    element={<TimesheetPage />}
                    path='/timesheet'
                />

                <Route
                    element={<FinancialPage />}
                    path='/financial'
                />

                <Route
                    element={<PaymentHistoryPage />}
                    path='/payment-history'
                />

                <Route
                    element={<StatisticsPage />}
                    path='/statistics'
                />

            </Route>
        </Route>
    )
)

export function Router() {
    return <RouterProvider router={router} />
}
