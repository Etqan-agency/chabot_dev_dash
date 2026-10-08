import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ComingSoon } from '@/pages/ComingSoon'
import { Spinner } from '@/components/ui/Spinner'
import { useI18n } from '@/hooks/useI18n'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import VerifyEmailPage from '@/pages/VerifyEmailPage'
import DashboardPage from '@/pages/DashboardPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import DocumentsPage from '@/pages/DocumentsPage'
import ApiSyncPage from '@/pages/ApiSyncPage'
import KnowledgeGapsPage from '@/pages/KnowledgeGapsPage'
import GuidedTreePage from '@/pages/GuidedTreePage'
import KnowledgeChunksPage from '@/pages/KnowledgeChunksPage'
import ConfigPage from '@/pages/ConfigPage'
import SettingsPage from '@/pages/SettingsPage'
import NotFoundPage from '@/pages/NotFoundPage'

// Chat pulls in the markdown renderer — load it only when visited.
const ChatPage = lazy(() => import('@/pages/ChatPage'))
// Billing (plan catalog + points history) — load on demand.
const BillingPage = lazy(() => import('@/pages/BillingPage'))
// Public marketing site — standalone page, loaded on demand.
const MarketingPage = lazy(() => import('@/pages/MarketingPage'))
// Admin panel — only ever reached by admins, load on demand.
// Users hub bundles user management + subscriptions + all-tenant analytics.
const AdminUsersHub = lazy(() => import('@/pages/admin/AdminUsersHub'))
const ApiKeysPage = lazy(() => import('@/pages/admin/ApiKeysPage'))
const PlansPage = lazy(() => import('@/pages/admin/PlansPage'))

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner className="size-7" />
    </div>
  )
}

export default function App() {
  const { t } = useI18n()
  const soon = (key: string) => (
    <ComingSoon title={t(`page.${key}.title`)} description={t(`page.${key}.desc`)} />
  )

  return (
    <Routes>
      {/* Public marketing site (standalone — outside the dashboard shell) */}
      <Route
        path="/home"
        element={
          <Suspense fallback={<PageFallback />}>
            <MarketingPage />
          </Suspense>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* Authenticated app shell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route
            path="chat"
            element={
              <Suspense fallback={<PageFallback />}>
                <ChatPage />
              </Suspense>
            }
          />
          <Route path="config" element={<ConfigPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="knowledge/api" element={<ApiSyncPage />} />
          <Route path="knowledge/chunks" element={<KnowledgeChunksPage />} />
          <Route path="knowledge/tree" element={<GuidedTreePage />} />
          <Route path="knowledge/gaps" element={<KnowledgeGapsPage />} />
          <Route path="whatsapp" element={soon('whatsapp')} />
          <Route
            path="billing"
            element={
              <Suspense fallback={<PageFallback />}>
                <BillingPage />
              </Suspense>
            }
          />
          <Route path="settings" element={<SettingsPage />} />

          {/* Admin-only panel */}
          <Route element={<ProtectedRoute adminOnly />}>
            <Route
              path="admin/users"
              element={
                <Suspense fallback={<PageFallback />}>
                  <AdminUsersHub />
                </Suspense>
              }
            />
            <Route
              path="admin/api-keys"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ApiKeysPage />
                </Suspense>
              }
            />
            <Route
              path="admin/plans"
              element={
                <Suspense fallback={<PageFallback />}>
                  <PlansPage />
                </Suspense>
              }
            />
            {/* Subscriptions & all-tenant analytics now live inside the Users hub. */}
            <Route path="admin/subscriptions" element={<Navigate to="/admin/users" replace />} />
            <Route path="admin/tenants" element={<Navigate to="/admin/users" replace />} />
          </Route>
        </Route>
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  )
}
