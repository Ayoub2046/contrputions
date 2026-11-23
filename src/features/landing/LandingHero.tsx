import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Shield, TrendingUp, Sparkles } from 'lucide-react'
import type { LandingPageSettings } from '../../lib/types'

interface LandingHeroProps {
  settings: LandingPageSettings
}

export function LandingHero({ settings }: LandingHeroProps) {
  const hasBgImage = Boolean(settings.hero_bg_image && settings.hero_bg_image.trim() !== '')
  const opacityPercent = settings.hero_bg_overlay_opacity ?? 85
  const overlayOpacity = Math.max(0.2, Math.min(0.98, opacityPercent / 100))

  return (
    <section className="relative overflow-hidden border-b border-border min-h-[640px] flex items-center justify-center">
      {/* Background Image Layer */}
      {hasBgImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
          style={{ backgroundImage: `url(${settings.hero_bg_image})` }}
        />
      ) : (
        /* Dynamic Mesh Gradient Default */
        <div className="absolute inset-0 bg-gradient-to-br from-bg-main via-brand-50/40 to-bg-main dark:from-bg-main dark:via-brand-900/15 dark:to-bg-main">
          <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-brand-600/10 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-brand-600/15 blur-3xl" />
        </div>
      )}

      {/* Adaptive Theme Overlay for Readability */}
      {hasBgImage && (
        <div
          className="absolute inset-0 bg-bg-main transition-opacity duration-300 backdrop-blur-[2px]"
          style={{ opacity: overlayOpacity }}
        />
      )}

      {/* Content Container */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headlines & CTA */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6">
            {/* Announcement / Badge */}
            {settings.hero_badge && (
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-600/30 bg-brand-50/80 dark:bg-brand-900/30 px-3.5 py-1 text-xs font-semibold text-brand-600 dark:text-brand-900 shadow-sm backdrop-blur-sm animate-fade-in">
                <Sparkles size={14} className="text-brand-600 dark:text-brand-900" />
                <span>{settings.hero_badge}</span>
              </div>
            )}

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-text leading-[1.12]">
              {settings.hero_title}
            </h1>

            {/* Subtitle */}
            <p className="max-w-2xl mx-auto lg:mx-0 text-base sm:text-lg text-secondary leading-relaxed font-sans">
              {settings.hero_subtitle}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Link
                to={settings.cta_primary_link || '/login'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-btn bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-md shadow-brand-600/20 hover:bg-brand-600/90 hover:shadow-lg hover:shadow-brand-600/30 active:scale-98 transition-all"
              >
                <span>{settings.cta_primary_text || 'Access Portal'}</span>
                <ArrowRight size={18} />
              </Link>

              {settings.cta_secondary_text && (
                <a
                  href={settings.cta_secondary_link || '#features'}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-btn border border-border-hover bg-bg-card/90 px-6 py-3.5 text-base font-medium text-text hover:bg-bg-elevated hover:border-brand-600/40 active:scale-98 transition-all backdrop-blur-sm"
                >
                  {settings.cta_secondary_text}
                </a>
              )}
            </div>

            {/* Trust Checklist */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-6 text-xs text-secondary font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-success shrink-0" />
                <span>Zero stored computed balances</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield size={15} className="text-brand-600 shrink-0" />
                <span>Row Level Security (RLS)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp size={15} className="text-warning shrink-0" />
                <span>Live payment calculations</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Live Preview Card */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md rounded-card border border-border bg-bg-card/95 p-6 shadow-2xl backdrop-blur-xl space-y-5 transition-transform hover:-translate-y-1 duration-300">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-btn bg-brand-50 dark:bg-brand-900/40 text-brand-600 font-bold">
                    CB
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text">Class Financial Summary</h3>
                    <p className="text-xs text-muted">BSIT 2026 &middot; Live Ledger</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Live
                </span>
              </div>

              {/* Balance Showcase */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-btn bg-bg-elevated p-3 border border-border/50">
                  <p className="text-[11px] text-muted font-medium">Total Contributions</p>
                  <p className="text-xl font-bold text-success font-sans mt-0.5">$3,450.00</p>
                  <p className="text-[10px] text-muted mt-1">23 Students Paid</p>
                </div>
                <div className="rounded-btn bg-bg-elevated p-3 border border-border/50">
                  <p className="text-[11px] text-muted font-medium">Total Expenses</p>
                  <p className="text-xl font-bold text-error font-sans mt-0.5">$820.00</p>
                  <p className="text-[10px] text-muted mt-1">4 Recorded Activities</p>
                </div>
              </div>

              {/* Derived Remaining Fund */}
              <div className="rounded-btn bg-brand-50/70 dark:bg-brand-900/25 p-3.5 border border-brand-600/20 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-brand-900 dark:text-brand-50">Remaining Class Treasury</p>
                  <p className="text-[11px] text-secondary">Derived dynamically from raw ledger</p>
                </div>
                <p className="text-xl font-bold text-brand-600 dark:text-brand-900 font-sans">
                  $2,630.00
                </p>
              </div>

              {/* Sample Payment Status Snapshot */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs text-muted pb-1 border-b border-border/40 font-medium">
                  <span>Student</span>
                  <span>Target ($150)</span>
                  <span>Status</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="font-medium text-text">Ahmed Hassan</span>
                  <span className="text-secondary">$150.00</span>
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">Paid</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="font-medium text-text">Fatima Ali</span>
                  <span className="text-secondary">$100.00</span>
                  <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning">Partial</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="font-medium text-text">Mustafa Omar</span>
                  <span className="text-secondary">$0.00</span>
                  <span className="rounded-full bg-error/10 px-2 py-0.5 text-[10px] font-bold text-error">Unpaid</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
