import { Link } from 'react-router-dom'
import { ShieldCheck, Smartphone, Code2 } from 'lucide-react'
import { AppLogo, useAppName } from '../../hooks/useAppLogo'

export function LandingFooter() {
  const currentYear = new Date().getFullYear()
  const appName = useAppName()

  return (
    <footer className="bg-[#ECECEC]/40 dark:bg-[#08121E] pt-14 pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <AppLogo className="h-8 w-auto object-contain" alt={appName} />
              <span className="font-sans text-2xl font-extrabold tracking-tight text-[#0B1A2B] dark:text-[#FFFFFF]">
                {appName}
              </span>
            </div>
            <p className="text-sm text-[#2F465E] dark:text-[#C6CACB] max-w-sm leading-relaxed">
              A clear, student-first contribution and expense ledger designed for ZUST &amp; Baidoa University classes.
            </p>
            <div className="flex items-center gap-4 text-xs text-[#52677D] dark:text-[#9FBBDE] font-semibold pt-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#1176BC] dark:text-[#25A8E0]" /> Verified Records
              </span>
              <span className="flex items-center gap-1.5">
                <Smartphone size={14} className="text-[#1176BC] dark:text-[#25A8E0]" /> Mobile Ready App
              </span>
            </div>
          </div>

          {/* Links Col 1 */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B1A2B] dark:text-[#FFFFFF]">
              Sections
            </h4>
            <ul className="space-y-2 text-sm text-[#2F465E] dark:text-[#C6CACB]">
              <li>
                <a href="#community-pledge" className="hover:text-[#1176BC] dark:hover:text-[#25A8E0] transition-colors">
                  Our Promise
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#1176BC] dark:hover:text-[#25A8E0] transition-colors">
                  What&apos;s Included
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-[#1176BC] dark:hover:text-[#25A8E0] transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-[#1176BC] dark:hover:text-[#25A8E0] transition-colors">
                  Questions
                </a>
              </li>
            </ul>
          </div>

          {/* Links Col 2 */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B1A2B] dark:text-[#FFFFFF]">
              Accountability Standard
            </h4>
            <p className="text-sm text-[#2F465E] dark:text-[#C6CACB] leading-relaxed">
              Every payment total and net class balance is calculated directly from individual verified transactions—nothing is edited manually in summary columns.
            </p>
            <div className="pt-1">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#1176BC] dark:text-[#25A8E0] hover:underline"
              >
                Sign in to your account &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-7 border-t border-[#C6CACB]/80 dark:border-[#1D3552] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#52677D] dark:text-[#C6CACB]">
          <p>&copy; {currentYear} {appName}. Built for University Classes.</p>
          <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-end">
            <span className="inline-flex items-center gap-1 font-semibold text-[#1176BC] dark:text-[#25A8E0]">
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
