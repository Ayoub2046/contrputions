import { Link } from 'react-router-dom'
import { useLandingSettings } from './useLandingSettings'
import { LandingNavbar } from './LandingNavbar'
import { LandingHero } from './LandingHero'
import { LandingStats } from './LandingStats'
import { LandingMercySection } from './LandingMercySection'
import { LandingFeatures } from './LandingFeatures'
import { LandingHowItWorks } from './LandingHowItWorks'
import { LandingFooter } from './LandingFooter'
import { ArrowRight, Sparkles } from 'lucide-react'

export function LandingPage() {
  const { settings } = useLandingSettings()

  return (
    <div className="min-h-screen bg-bg-main text-text selection:bg-brand-600 selection:text-white">
      {/* Top Announcement Bar */}
      {settings.show_announcement && settings.announcement_text && (
        <aside
          aria-label="Announcement"
          className="bg-brand-600 px-4 py-2 text-center text-xs font-semibold text-white transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles size={14} className="shrink-0" />
          <span>{settings.announcement_text}</span>
          {settings.announcement_link && (
            <a
              href={settings.announcement_link}
              className="underline underline-offset-2 ml-1 hover:text-brand-50"
            >
              Learn more
            </a>
          )}
        </aside>
      )}

      {/* Main Navbar */}
      <LandingNavbar />

      <main>
        {/* 3D Animated Hero Section */}
        <LandingHero settings={settings} />

        {/* Stats Bar */}
        <LandingStats stats={settings.stats_data} />

        {/* Powerful Student Solidarity, Mercy & Guilt-to-Charity Quote Section */}
        <LandingMercySection />

        {/* Features Section */}
        <LandingFeatures features={settings.features_data} />

        {/* How It Works & Transparency Model */}
        <LandingHowItWorks />

        {/* Call to Action Section */}
        <section className="py-20 bg-gradient-to-br from-brand-900 to-slate-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-brand-600/20 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight">
              Ready for 100% financial clarity in your class?
            </h2>
            <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed">
              Join students and class leaders who trust ClassBank for auditable contributions,
              instant expense tracking, and error-free financial reporting.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-btn bg-brand-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg hover:bg-brand-600/90 active:scale-98 transition-all"
              >
                Access Portal Now <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  )
}
