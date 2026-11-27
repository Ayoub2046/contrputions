import { Link } from 'react-router-dom'
import { ShieldCheck, Smartphone, Code2 } from 'lucide-react'
import { AppLogo, useAppName } from '../../hooks/useAppLogo'

export function LandingFooter() {
  const currentYear = new Date().getFullYear()
  const appName = useAppName()

  return (
    <footer id="security" className="bg-bg-card border-t border-border pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <AppLogo className="h-8 w-auto object-contain" alt={appName} />
              <span className="font-serif text-2xl font-bold tracking-tight text-text">{appName}</span>
            </div>
            <p className="text-sm text-secondary max-w-sm leading-relaxed">
              The modern Progressive Web App (PWA) delivering total financial transparency for university classes,
              student unions, and academic contributions.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted font-medium pt-2">
              <span className="flex items-center gap-1">
                <ShieldCheck size={14} className="text-success" /> Bank-grade PostgreSQL
              </span>
              <span className="flex items-center gap-1">
                <Smartphone size={14} className="text-brand-600" /> Installable PWA
              </span>
            </div>
          </div>

          {/* Links Col 1: Platform */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text">Platform</h4>
            <ul className="space-y-2 text-sm text-secondary">
              <li><a href="#features" className="hover:text-text transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-text transition-colors">How It Works</a></li>
              <li><a href="#transparency" className="hover:text-text transition-colors">Transparency Model</a></li>
              <li><Link to="/login" className="hover:text-text transition-colors">Sign In Portal</Link></li>
            </ul>
          </div>

          {/* Links Col 2: Security & Governance */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text">Core Governance</h4>
            <p className="text-sm text-secondary leading-relaxed">
              ClassBank strictly enforces <strong>zero stored computed balances</strong>. All student payment statuses,
              collection percentages, and remaining balances are derived on-the-fly directly from audited transactions.
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-900 hover:underline"
              >
                Access Your Class Account &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <p>&copy; {currentYear} {appName}. All rights reserved.</p>
          <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-end">
            <span>Powered by Supabase &amp; React</span>
            <span aria-hidden="true">&middot;</span>
            <span>Progressive Web App</span>
            <span aria-hidden="true">&middot;</span>
            <span className="inline-flex items-center gap-1 font-semibold text-brand-600 dark:text-brand-400">
              <Code2 size={12} />
              Developed by{' '}
              <a
                href="https://jsomtech.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline underline-offset-2"
              >
                jsomtech
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
