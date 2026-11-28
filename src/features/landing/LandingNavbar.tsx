import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { useTheme } from '../../hooks/useTheme'
import { Sun, Moon, Globe, Menu, X, ArrowRight, LogOut } from 'lucide-react'
import { PwaInstallButton } from '../../components/pwa/PwaInstallButton'
import { AppLogo, useAppName } from '../../hooks/useAppLogo'

export function LandingNavbar() {
  const { i18n } = useTranslation()
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const appName = useAppName()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleLanguage = () => {
    const next = i18n.language === 'en' ? 'so' : 'en'
    i18n.changeLanguage(next)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#C6CACB]/80 dark:border-[#1D3552] bg-[#FFFFFF]/95 dark:bg-[#08121E]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-3">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="size-9 rounded-lg bg-[#FFFFFF] dark:bg-[#0E1D31] border border-[#C6CACB] dark:border-[#1D3552] p-1 flex items-center justify-center">
            <AppLogo className="size-full object-contain" alt={appName} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#0B1A2B] dark:text-[#FFFFFF]">
              {appName}
            </span>
            <span className="text-[10px] font-medium tracking-wider uppercase text-[#1176BC] dark:text-[#25A8E0] hidden sm:block">
              Class Treasury Portal
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#2F465E] dark:text-[#C6CACB]">
          <a href="#community-pledge" className="hover:text-[#1176BC] dark:hover:text-[#25A8E0] transition-colors">
            Our Promise
          </a>
          <a href="#features" className="hover:text-[#1176BC] dark:hover:text-[#25A8E0] transition-colors">
            What&apos;s Included
          </a>
          <a href="#how-it-works" className="hover:text-[#1176BC] dark:hover:text-[#25A8E0] transition-colors">
            How It Works
          </a>
          <a href="#faq" className="hover:text-[#1176BC] dark:hover:text-[#25A8E0] transition-colors">
            Questions
          </a>
        </nav>

        {/* Right Controls */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <PwaInstallButton size="sm" />

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="inline-flex h-9 items-center gap-1.5 px-2.5 rounded-lg border border-[#C6CACB] dark:border-[#1D3552] bg-[#ECECEC]/70 dark:bg-[#0E1D31] text-xs font-semibold text-[#0B1A2B] dark:text-[#FFFFFF] hover:border-[#1176BC] dark:hover:border-[#25A8E0] transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun size={15} className="text-[#25A8E0]" />
            ) : (
              <Moon size={15} className="text-[#1176BC]" />
            )}
            <span className="hidden xl:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex h-9 items-center gap-1.5 px-2.5 rounded-lg border border-[#C6CACB] dark:border-[#1D3552] bg-[#FFFFFF] dark:bg-[#0E1D31] text-xs font-semibold text-[#0B1A2B] dark:text-[#FFFFFF] hover:border-[#1176BC] dark:hover:border-[#25A8E0] transition-colors cursor-pointer"
          >
            <Globe size={15} className="text-[#1176BC] dark:text-[#25A8E0]" />
            <span className="uppercase">{i18n.language === 'so' ? 'SO' : 'EN'}</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1176BC] hover:bg-[#0D5E97] px-4 py-2 text-xs font-semibold text-[#FFFFFF] transition-colors"
              >
                Open Dashboard <ArrowRight size={14} />
              </Link>
              <button
                type="button"
                onClick={signOut}
                title="Sign out"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#C6CACB] dark:border-[#1D3552] text-xs font-semibold text-[#2F465E] dark:text-[#C6CACB] hover:text-[#DC2626] dark:hover:text-[#F87171] hover:border-[#DC2626]/40 transition-colors cursor-pointer"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1176BC] hover:bg-[#0D5E97] px-4 py-2 text-sm font-semibold text-[#FFFFFF] transition-colors"
            >
              Sign In <ArrowRight size={15} />
            </Link>
          )}
        </div>

        {/* Mobile triggers */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#C6CACB] dark:border-[#1D3552] bg-[#ECECEC]/70 dark:bg-[#0E1D31] text-[#0B1A2B] dark:text-[#FFFFFF]"
          >
            {theme === 'dark' ? (
              <Sun size={17} className="text-[#25A8E0]" />
            ) : (
              <Moon size={17} className="text-[#1176BC]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#C6CACB] dark:border-[#1D3552] bg-[#ECECEC]/70 dark:bg-[#0E1D31] text-[#0B1A2B] dark:text-[#FFFFFF]"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-[#C6CACB] dark:border-[#1D3552] bg-[#FFFFFF] dark:bg-[#08121E] px-4 pt-3 pb-5 space-y-3 shadow-lg">
          <div className="flex flex-col space-y-1 text-sm font-medium text-[#2F465E] dark:text-[#DCE8F5]">
            <a
              href="#community-pledge"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#ECECEC] dark:hover:bg-[#0E1D31] text-[#1176BC] dark:text-[#25A8E0] font-semibold"
            >
              Our Promise
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#ECECEC] dark:hover:bg-[#0E1D31] hover:text-[#0B1A2B] dark:hover:text-[#FFFFFF]"
            >
              What&apos;s Included
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#ECECEC] dark:hover:bg-[#0E1D31] hover:text-[#0B1A2B] dark:hover:text-[#FFFFFF]"
            >
              How It Works
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#ECECEC] dark:hover:bg-[#0E1D31] hover:text-[#0B1A2B] dark:hover:text-[#FFFFFF]"
            >
              Questions
            </a>
          </div>

          <div className="pt-3 border-t border-[#ECECEC] dark:border-[#1D3552] flex flex-wrap items-center justify-between gap-2">
            <PwaInstallButton size="sm" />
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#C6CACB] dark:border-[#1D3552] bg-[#FFFFFF] dark:bg-[#0E1D31] text-[#0B1A2B] dark:text-[#FFFFFF]"
            >
              <Globe size={14} className="text-[#1176BC] dark:text-[#25A8E0]" />
              <span className="uppercase">{i18n.language}</span>
            </button>
            {user ? (
              <div className="flex items-center gap-2 ml-auto">
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-1.5 rounded-lg bg-[#1176BC] px-3 py-1.5 text-xs font-semibold text-[#FFFFFF]"
                >
                  Dashboard <ArrowRight size={14} />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    signOut()
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-error/40 text-xs font-semibold text-error"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-1.5 rounded-lg bg-[#1176BC] px-4 py-2 text-sm font-semibold text-[#FFFFFF] ml-auto"
              >
                Sign In <ArrowRight size={15} />
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
