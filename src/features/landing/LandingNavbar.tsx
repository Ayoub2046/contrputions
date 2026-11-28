import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { useTheme } from '../../hooks/useTheme'
import { Sun, Moon, Globe, Menu, X, ArrowRight, LogOut, HeartHandshake } from 'lucide-react'
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
    <header className="sticky top-0 z-50 w-full border-b border-[#ECECEC] dark:border-[#203854] bg-[#FFFFFF]/95 dark:bg-[#0D1B2C]/95 backdrop-blur-md shadow-2xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-3">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="size-9 rounded-xl bg-[#FFFFFF] dark:bg-[#172D47] border border-[#ECECEC] dark:border-[#203854] p-1 flex items-center justify-center shadow-2xs">
            <AppLogo className="size-full object-contain transition-transform group-hover:scale-105" alt={appName} />
          </div>
          <span className="font-serif text-2xl font-bold tracking-tight text-[#0B1A2B] dark:text-[#FFFFFF]">
            {appName}
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#2F465E] dark:text-[#C6CACB]">
          <a href="#features" className="hover:text-[#1176BC] dark:hover:text-[#25A8E0] transition-colors">
            Features
          </a>
          <a
            href="#community-pledge"
            className="flex items-center gap-1.5 text-[#1176BC] dark:text-[#25A8E0] hover:text-[#0D5E97] dark:hover:text-[#FFFFFF] font-semibold transition-colors"
          >
            <HeartHandshake size={15} /> Community &amp; Values
          </a>
          <a href="#how-it-works" className="hover:text-[#1176BC] dark:hover:text-[#25A8E0] transition-colors">
            How It Works
          </a>
          <a href="#transparency" className="hover:text-[#1176BC] dark:hover:text-[#25A8E0] transition-colors">
            Transparency
          </a>
        </nav>

        {/* Right side controls */}
        <div className="hidden sm:flex items-center gap-2.5 shrink-0">
          <PwaInstallButton size="sm" />

          {/* Clear Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="flex h-9 items-center gap-1.5 px-2.5 rounded-btn border border-[#C6CACB] dark:border-[#203854] bg-[#ECECEC]/70 dark:bg-[#172D47] text-xs font-semibold text-[#0B1A2B] dark:text-[#FFFFFF] hover:border-[#1176BC] dark:hover:border-[#25A8E0] transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun size={15} className="text-[#25A8E0]" /> : <Moon size={15} className="text-[#1176BC]" />}
            <span className="hidden xl:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex h-9 items-center gap-1.5 px-2.5 rounded-btn border border-[#C6CACB] dark:border-[#203854] bg-[#FFFFFF] dark:bg-[#172D47] text-xs font-semibold text-[#0B1A2B] dark:text-[#FFFFFF] hover:border-[#1176BC] dark:hover:border-[#25A8E0] transition-colors cursor-pointer"
          >
            <Globe size={15} className="text-[#1176BC] dark:text-[#25A8E0]" />
            <span className="uppercase">{i18n.language === 'so' ? 'SO' : 'EN'}</span>
          </button>

          {/* Auth Button */}
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 rounded-btn bg-gradient-to-r from-[#1176BC] to-[#25A8E0] px-4 py-2 text-xs font-semibold text-[#FFFFFF] shadow-sm hover:opacity-95 active:scale-95 transition-all"
              >
                Dashboard <ArrowRight size={14} />
              </Link>
              <button
                type="button"
                onClick={signOut}
                title="Sign out of current account"
                className="flex items-center gap-1.5 px-3 py-2 rounded-btn border border-[#C6CACB] dark:border-[#203854] text-xs font-semibold text-[#2F465E] dark:text-[#C6CACB] hover:text-[#DC2626] dark:hover:text-[#F87171] hover:border-[#DC2626]/40 transition-all cursor-pointer"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 rounded-btn bg-gradient-to-r from-[#1176BC] to-[#25A8E0] px-4 py-2 text-sm font-semibold text-[#FFFFFF] shadow-sm hover:shadow-md hover:opacity-95 active:scale-95 transition-all"
            >
              Sign In <ArrowRight size={15} />
            </Link>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-btn border border-[#C6CACB] dark:border-[#203854] bg-[#ECECEC]/70 dark:bg-[#172D47] text-[#0B1A2B] dark:text-[#FFFFFF]"
          >
            {theme === 'dark' ? <Sun size={17} className="text-[#25A8E0]" /> : <Moon size={17} className="text-[#1176BC]" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-btn border border-[#C6CACB] dark:border-[#203854] bg-[#ECECEC]/70 dark:bg-[#172D47] text-[#0B1A2B] dark:text-[#FFFFFF]"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-[#ECECEC] dark:border-[#203854] bg-[#FFFFFF] dark:bg-[#0D1B2C] px-4 pt-3 pb-5 space-y-3 shadow-lg">
          <div className="flex flex-col space-y-1.5 text-sm font-medium text-[#2F465E] dark:text-[#DCE8F5]">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-btn hover:bg-[#ECECEC] dark:hover:bg-[#172D47] hover:text-[#0B1A2B] dark:hover:text-[#FFFFFF]"
            >
              Features
            </a>
            <a
              href="#charity-pledge"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-btn bg-[#9FBBDE]/15 dark:bg-[#172D47] text-[#1176BC] dark:text-[#25A8E0] font-semibold"
            >
              Student Mercy Pledge
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-btn hover:bg-[#ECECEC] dark:hover:bg-[#172D47] hover:text-[#0B1A2B] dark:hover:text-[#FFFFFF]"
            >
              How It Works
            </a>
            <a
              href="#transparency"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-btn hover:bg-[#ECECEC] dark:hover:bg-[#172D47] hover:text-[#0B1A2B] dark:hover:text-[#FFFFFF]"
            >
              Transparency
            </a>
          </div>

          <div className="pt-3 border-t border-[#ECECEC] dark:border-[#203854] flex flex-wrap items-center justify-between gap-2">
            <PwaInstallButton size="sm" />
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-btn border border-[#C6CACB] dark:border-[#203854] bg-[#FFFFFF] dark:bg-[#172D47] text-[#0B1A2B] dark:text-[#FFFFFF]"
            >
              <Globe size={14} className="text-[#1176BC] dark:text-[#25A8E0]" />
              <span className="uppercase">{i18n.language}</span>
            </button>
            {user ? (
              <div className="flex items-center gap-2 ml-auto">
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-1.5 rounded-btn bg-gradient-to-r from-[#1176BC] to-[#25A8E0] px-3 py-1.5 text-xs font-semibold text-[#FFFFFF]"
                >
                  Dashboard <ArrowRight size={14} />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    signOut()
                  }}
                  className="px-2.5 py-1.5 rounded-btn border border-error/40 text-xs font-semibold text-error"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-1.5 rounded-btn bg-gradient-to-r from-[#1176BC] to-[#25A8E0] px-4 py-2 text-sm font-semibold text-[#FFFFFF] ml-auto"
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
