import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell.jsx';
import { GuestRoute, ProtectedRoute } from '../features/auth/ProtectedRoute.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { RegisterPage } from '../pages/RegisterPage.jsx';
import { DashboardPage } from '../pages/DashboardPage.jsx';
import { CollaborationsPage } from '../pages/CollaborationsPage.jsx';
import { ContentPlannerPage } from '../pages/ContentPlannerPage.jsx';
import { FinancePage } from '../pages/FinancePage.jsx';
import { CopilotPage } from '../pages/CopilotPage.jsx';
import { SettingsPage } from '../pages/SettingsPage.jsx';

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/collaborations', element: <CollaborationsPage /> },
          { path: '/planner', element: <ContentPlannerPage /> },
          { path: '/finance', element: <FinancePage /> },
          { path: '/copilot', element: <CopilotPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
