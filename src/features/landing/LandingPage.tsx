import { Link } from 'react-router-dom'
import { useLandingSettings } from './useLandingSettings'
import { LandingNavbar } from './LandingNavbar'
import { LandingHero } from './LandingHero'
import { LandingStats } from './LandingStats'
import { LandingMercySection } from './LandingMercySection'
import { LandingFeatures } from './LandingFeatures'
import { LandingHowItWorks } from './LandingHowItWorks'
import { LandingFooter } from './LandingFooter'
import { PwaInstallBanner } from '../../components/pwa/PwaInstallBanner'
import { ArrowRight } from 'lucide-react'

export function LandingPage() {
  const { settings } = useLandingSettings()

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-[#08121E] text-[#0B1A2B] dark:text-[#FFFFFF] selection:bg-[#1176BC] selection:text-[#FFFFFF]">
      <PwaInstallBanner />

      {/* Optional Announcement Strip */}
      {settings.show_announcement && settings.announcement_text && (
        <aside
          aria-label="Announcement"
          className="bg-[#1176BC] px-4 py-2 text-center text-xs font-semibold text-[#FFFFFF] flex items-center justify-center gap-2 flex-wrap"
        >
          <span>{settings.announcement_text}</span>
          {settings.announcement_link && (
            <Link
              to={settings.announcement_link}
              className="underline underline-offset-2 font-bold hover:text-[#ECECEC]"
            >
              View &rarr;
            </Link>
          )}
        </aside>
      )}

      <LandingNavbar />

      <main>
        <LandingHero settings={settings} />
        <LandingStats stats={settings.stats_data} />
        <LandingMercySection />
        <LandingFeatures features={settings.features_data} />
        <LandingHowItWorks />

        {/* Clean Grounded University Portal Call-to-Action */}
        <section className="py-16 sm:py-20 bg-[#1176BC] dark:bg-[#0A4673] text-[#FFFFFF] border-b border-[#0D5E97]">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-2.5 max-w-xl">
              <span className="text-xs font-bold uppercase tracking-widest text-[#FFFFFF]/80">
                University Class Access
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#FFFFFF] leading-tight">
                Check your contribution record in seconds.
              </h2>
              <p className="text-sm sm:text-base text-[#FFFFFF]/90 leading-relaxed">
                Sign in with the Student ID given by your class representative to see your payment history, print receipts, or message your Class Admin privately.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFFFFF] hover:bg-[#ECECEC] px-6 py-3.5 text-sm font-bold text-[#1176BC] shadow-sm transition-colors"
              >
                Student Sign In <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#FFFFFF]/40 hover:bg-[#FFFFFF]/10 px-6 py-3.5 text-sm font-bold text-[#FFFFFF] transition-colors"
              >
                Class Admin Login
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
