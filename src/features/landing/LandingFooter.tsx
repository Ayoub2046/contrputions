import { Link } from 'react-router-dom'
import { ShieldCheck, Smartphone, Globe } from 'lucide-react'

export function LandingFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer id="security" className="bg-bg-card border-t border-border pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <img src="/classBankLogo.png" alt="ClassBank" className="h-8 w-auto object-contain" />
              <span className="font-serif text-2xl font-bold tracking-tight text-text">ClassBank</span>
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
          <p>&copy; {currentYear} ClassBank System. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Powered by Supabase & React</span>
            <span>Progressive Web App</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
