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
import { ArrowRight, Sparkles } from 'lucide-react'

export function LandingPage() {
  const { settings } = useLandingSettings()

  return (
    <div className="min-h-screen bg-[#F4F8FC] dark:bg-[#09131F] text-[#0B1A2B] dark:text-[#FFFFFF] selection:bg-[#1176BC] selection:text-[#FFFFFF]">
      <PwaInstallBanner />

      {/* Top Announcement Bar */}
      {settings.show_announcement && settings.announcement_text && (
        <aside
          aria-label="Announcement"
          className="bg-gradient-to-r from-[#0A4673] via-[#1176BC] to-[#25A8E0] px-4 py-2 text-center text-xs font-semibold text-[#FFFFFF] flex items-center justify-center gap-2 flex-wrap"
        >
          <Sparkles size={14} className="shrink-0" />
          <span>{settings.announcement_text}</span>
          {settings.announcement_link && (
            <a
              href={settings.announcement_link}
              className="underline underline-offset-2 ml-1 font-bold hover:text-[#ECECEC]"
            >
              Learn more
            </a>
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

        {/* Executive University CTA Section */}
        <section className="py-20 bg-gradient-to-br from-[#093254] via-[#1176BC] to-[#1D8CC8] text-[#FFFFFF] relative overflow-hidden">
          <div className="absolute -top-24 -right-24 size-96 rounded-full bg-[#25A8E0]/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 size-96 rounded-full bg-[#9FBBDE]/15 blur-3xl pointer-events-none" />
          <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight text-[#FFFFFF]">
              Bring 100% Financial Clarity &amp; Respect to Your Class
            </h2>
            <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#FFFFFF]/90 leading-relaxed">
              Whether you are a student checking your contribution balance or a class administrator managing course expenses, ClassBank keeps every transaction clear, verified, and confidential.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFFFFF] px-8 py-3.5 text-base font-bold text-[#1176BC] shadow-xl hover:bg-[#ECECEC] active:scale-98 transition-all"
              >
                Access Student Portal <ArrowRight size={18} />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#FFFFFF]/40 bg-[#FFFFFF]/10 hover:bg-[#FFFFFF]/20 px-8 py-3.5 text-base font-bold text-[#FFFFFF] transition-all"
              >
                Class Admin Desk
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
