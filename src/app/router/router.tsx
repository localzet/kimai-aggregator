/**
 * Router Configuration
 *
 * Конфигурация маршрутов приложения с использованием React Router.
 * Включает lazy loading для оптимизации bundle size.
 */

import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider,
} from "react-router-dom";
import { lazy } from "react";
import { AuthGuard } from "./guards";
import { ErrorPage } from "./components";
import { RootLayout } from "../layouts/root/root.layout";
import { ErrorBoundaryHoc } from "@shared/hoks/error-boundary";

// Lazy load pages for code splitting
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const SetupPage = lazy(() => import("@/pages/SetupPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const TimesheetPage = lazy(() => import("@/pages/TimesheetPage"));
const FinancialPage = lazy(() => import("@/pages/FinancialPage"));
const PaymentHistoryPage = lazy(() => import("@/pages/PaymentHistoryPage"));
const StatisticsPage = lazy(() => import("@/pages/StatisticsPage"));
const CalendarPage = lazy(() => import("@/pages/CalendarPage"));
const TimeAnalysisPage = lazy(() => import("@/pages/TimeAnalysisPage"));
const MLInsightsPage = lazy(() => import("@/pages/MLInsightsPage"));
const MainLayout = lazy(() =>
  import("@/widgets/layout").then((module) => ({ default: module.MainLayout })),
);

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<ErrorBoundaryHoc fallback={<ErrorPage />} />}>
      <Route element={<RootLayout />}>
        <Route element={<AuthGuard />}>
          <Route element={<Navigate replace to="/dashboard" />} path="/" />

          <Route element={<AuthPage />} path="/auth" />
          <Route element={<SetupPage />} path="/setup" />

          <Route element={<MainLayout />}>
            <Route element={<DashboardPage />} path="/dashboard" index />
            <Route element={<SettingsPage />} path="/settings" />
            <Route element={<TimesheetPage />} path="/timesheet" />
            <Route element={<FinancialPage />} path="/financial" />
            <Route element={<PaymentHistoryPage />} path="/payment-history" />
            <Route element={<StatisticsPage />} path="/statistics" />
            <Route element={<CalendarPage />} path="/calendar" />
            <Route element={<TimeAnalysisPage />} path="/time-analysis" />
            <Route element={<MLInsightsPage />} path="/ml-insights" />
          </Route>
        </Route>
        <Route path="*" element={<Navigate replace to="/" />} />
      </Route>
    </Route>,
  ),
);

export function Router() {
  return <RouterProvider router={router} />;
}
