import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { LoginPage } from './features/auth/LoginPage'
import { AppShell } from './components/layout/AppShell'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ClassesPage } from './features/classes/ClassesPage'
import { StudentsPage } from './features/students/StudentsPage'
import { ContributionsPage } from './features/contributions/ContributionsPage'
import { ExpensesPage } from './features/expenses/ExpensesPage'
import { ReportsPage } from './features/reports/ReportsPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { AdminsPage } from './features/admins/AdminsPage'
import { RecycleBinPage } from './features/recyclebin/RecycleBinPage'
import { LandingPage } from './features/landing/LandingPage'
import { LandingCmsPage } from './features/cms/LandingCmsPage'

function AppLayout() {
  const { user, signOut } = useAuth()

  if (!user) return null

  return (
    <AppShell role={user.role} onSignOut={signOut}>
      <ErrorBoundary>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/contributions" element={<ContributionsPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admins" element={<AdminsPage />} />
          <Route path="/recycle-bin" element={<RecycleBinPage />} />
          <Route path="/landing-cms" element={<LandingCmsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ErrorBoundary>
    </AppShell>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Landing Page accessible to all visitors */}
          <Route path="/" element={<LandingPage />} />

          {/* Authentication Page */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/*" element={<AppLayout />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
