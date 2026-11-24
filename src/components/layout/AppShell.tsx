import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { Sidebar, navItems } from './Sidebar'
import { useAuth } from '../../features/auth/AuthContext'
import { cn } from '../../lib/utils'
import {
  MoreHorizontal,
  X,
  LogOut,
  Globe,
  Sun,
  Moon,
} from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { PwaInstallButton } from '../pwa/PwaInstallButton'
import { WhatsAppNotificationBanner } from '../../features/notifications/WhatsAppNotificationBanner'
import { NotificationPermissionBanner } from '../../features/notifications/NotificationPermissionBanner'
import { NotificationBell } from '../../features/notifications/NotificationBell'
import { AppLogo } from '../../hooks/useAppLogo'
import type { UserRole } from '../../lib/types'

interface AppShellProps {
  role: UserRole
  onSignOut: () => void
  children: React.ReactNode
}

function BottomNav({ role, onSignOut }: { role: UserRole; onSignOut: () => void }) {
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const [showMore, setShowMore] = useState(false)
  const items = navItems[role]
  const maxVisible = 4
  const visible = items.slice(0, maxVisible)
  const overflow = items.slice(maxVisible)
  const languages = [
    { code: 'en', label: 'English' },
    { code: 'so', label: 'Soomaali' },
  ]

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-card/95 backdrop-blur-md border-t border-border shadow-lg pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 px-1">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all min-w-0 flex-1 h-14',
                  isActive ? 'text-brand-600 font-semibold bg-brand-50/60 dark:bg-brand-900/20' : 'text-muted hover:text-text',
                )
              }
            >
              <item.icon size={20} className="shrink-0" />
              <span className="text-[10px] font-medium leading-tight truncate max-w-full">{t(`nav.${item.key}`)}</span>
            </NavLink>
          ))}
          {overflow.length > 0 && (
            <button
              onClick={() => setShowMore(true)}
              className="flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl text-muted hover:text-text transition-all min-w-0 flex-1 h-14 cursor-pointer"
            >
              <MoreHorizontal size={20} className="shrink-0" />
              <span className="text-[10px] font-medium leading-tight">{t('nav.settings')}</span>
            </button>
          )}
        </div>
      </nav>

      {showMore && (
        <div className="lg:hidden fixed inset-0 z-50 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setShowMore(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-bg-card border-t border-border rounded-t-3xl p-5 pb-24 shadow-2xl animate-in slide-in-from-bottom duration-250 max-h-[85vh] overflow-y-auto">
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-muted/30 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between mb-4">
              <span className="text-base font-bold text-text">More Navigation & Settings</span>
              <button
                onClick={() => setShowMore(false)}
                className="size-8 rounded-full flex items-center justify-center text-muted hover:text-text hover:bg-bg-elevated transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-1.5">
              {overflow.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setShowMore(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors',
                      isActive ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 font-semibold' : 'text-secondary hover:bg-bg-elevated hover:text-text',
                    )
                  }
                >
                  <item.icon size={19} className="shrink-0" />
                  {t(`nav.${item.key}`)}
                </NavLink>
              ))}
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2.5 mt-4 rounded-xl bg-bg-elevated/50 border border-border">
              <Globe size={16} className="text-muted shrink-0" />
              <select
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="flex-1 rounded-btn border border-border bg-bg-card px-2.5 py-1.5 text-xs font-semibold text-text focus:outline-none focus:ring-2 focus:ring-brand-600/30"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => { setShowMore(false); toggleTheme() }}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-secondary hover:bg-bg-elevated hover:text-text transition-colors cursor-pointer mt-2"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              {theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
            </button>
            <button
              onClick={() => { setShowMore(false); onSignOut() }}
              className="flex w-full items-center justify-between rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm font-semibold text-error hover:bg-error hover:text-white transition-all cursor-pointer mt-3 shadow-xs"
            >
              <span className="flex items-center gap-2.5">
                <LogOut size={18} />
                {t('nav.signOut')}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Exit</span>
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function MobileTopBar({ onSignOut }: { onSignOut: () => void }) {
  const { t } = useTranslation()
  const { adminClasses, activeClassId, setActiveClassId } = useAuth()

  return (
    <div className="lg:hidden flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 bg-bg-card/95 backdrop-blur-md border-b border-border sticky top-0 z-40 shadow-xs">
      <div className="flex items-center gap-2 min-w-0 shrink">
        <AppLogo className="h-6 sm:h-7 w-auto shrink-0" alt={t('app.name')} />
        <span className="font-bold text-text truncate text-xs sm:text-base">{t('app.name')}</span>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <NotificationBell />
        <PwaInstallButton size="sm" />
        {adminClasses.length > 0 && (
          <select
            value={activeClassId ?? ''}
            onChange={(e) => setActiveClassId(e.target.value || null)}
            className="rounded-btn border border-border bg-bg-card px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs text-text focus:outline-none focus:ring-2 focus:ring-brand-600/30 max-w-[95px] sm:max-w-[140px] truncate font-medium"
          >
            {adminClasses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        <button
          onClick={onSignOut}
          className="flex items-center justify-center size-8 sm:size-9 rounded-btn border border-error/30 text-error hover:bg-error hover:text-white transition-colors cursor-pointer shrink-0"
          title={t('nav.signOut')}
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  )
}

export function AppShell({ role, onSignOut, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-bg-main overflow-x-hidden flex flex-col">
      <WhatsAppNotificationBanner />
      <Sidebar role={role} onSignOut={onSignOut} />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0 w-full">
        <MobileTopBar onSignOut={onSignOut} />
        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 pb-28 lg:pb-8 min-w-0 w-full">
          <NotificationPermissionBanner />
          {children}
        </main>
      </div>
      <BottomNav role={role} onSignOut={onSignOut} />
    </div>
  )
}
