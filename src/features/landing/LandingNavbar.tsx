import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { useTheme } from '../../hooks/useTheme'
import { Sun, Moon, Globe, Menu, X, ArrowRight, ShieldCheck } from 'lucide-react'

export function LandingNavbar() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleLanguage = () => {
    const next = i18n.language === 'en' ? 'so' : 'en'
    i18n.changeLanguage(next)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-bg-card/85 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src="/classBankLogo.png" alt="ClassBank" className="h-9 w-auto object-contain transition-transform group-hover:scale-105" />
          <span className="font-serif text-2xl font-bold tracking-tight text-text">ClassBank</span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-secondary">
          <a href="#features" className="hover:text-text transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-text transition-colors">How It Works</a>
          <a href="#transparency" className="hover:text-text transition-colors">Transparency Model</a>
          <a href="#security" className="hover:text-text transition-colors">Security</a>
        </nav>

        {/* Right side controls */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-btn border border-border bg-bg-elevated text-secondary hover:text-text hover:border-border-hover transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="flex h-9 items-center gap-1.5 px-2.5 rounded-btn border border-border bg-bg-elevated text-xs font-semibold text-secondary hover:text-text hover:border-border-hover transition-colors cursor-pointer"
          >
            <Globe size={15} />
            <span className="uppercase">{i18n.language === 'so' ? 'SO' : 'EN'}</span>
          </button>

          {/* Auth Button */}
          {user ? (
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 rounded-btn bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600/90 active:scale-95 transition-all"
            >
              Dashboard <ArrowRight size={15} />
            </Link>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 rounded-btn bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600/90 active:scale-95 transition-all"
            >
              Sign In <ArrowRight size={15} />
            </Link>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-btn border border-border bg-bg-elevated text-secondary"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-btn border border-border bg-bg-elevated text-secondary"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-border bg-bg-card px-4 pt-3 pb-5 space-y-3 shadow-lg">
          <div className="flex flex-col space-y-2 text-sm font-medium text-secondary">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-btn hover:bg-bg-elevated hover:text-text"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-btn hover:bg-bg-elevated hover:text-text"
            >
              How It Works
            </a>
            <a
              href="#transparency"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-btn hover:bg-bg-elevated hover:text-text"
            >
              Transparency Model
            </a>
            <a
              href="#security"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-btn hover:bg-bg-elevated hover:text-text"
            >
              Security
            </a>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-btn border border-border text-secondary"
            >
              <Globe size={15} /> Language: <span className="uppercase font-bold text-text">{i18n.language}</span>
            </button>
            {user ? (
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-1.5 rounded-btn bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Dashboard <ArrowRight size={15} />
              </Link>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-1.5 rounded-btn bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
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
