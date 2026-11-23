import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Sparkles,
  Heart,
  ShieldCheck,
  GraduationCap,
  Users,
  Coins,
  CheckCircle,
} from 'lucide-react'
import type { LandingPageSettings } from '../../lib/types'

interface LandingHeroProps {
  settings: LandingPageSettings
}

export function LandingHero({ settings }: LandingHeroProps) {
  const hasBgImage = Boolean(settings.hero_bg_image && settings.hero_bg_image.trim() !== '')
  const opacityPercent = settings.hero_bg_overlay_opacity ?? 85
  const overlayOpacity = Math.max(0.2, Math.min(0.98, opacityPercent / 100))

  // 3D Tilt State for Interactive Centerpiece
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    setTilt({
      x: -(y / (rect.height / 2)) * 10,
      y: (x / (rect.width / 2)) * 10,
    })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
  }

  // Interactive Contribution Impact Tier Selection
  const [selectedTier, setSelectedTier] = useState<number>(25)

  const impactTiers: Record<number, { title: string; desc: string; icon: any }> = {
    10: {
      title: 'Study Handouts & Lab Supplies',
      desc: 'Ensures no classmate is excluded from practical sessions due to unpaid material fees.',
      icon: Coins,
    },
    25: {
      title: 'Exam Registration Clearance',
      desc: 'Directly covers exam sitting clearances for a student facing sudden financial crisis.',
      icon: GraduationCap,
    },
    50: {
      title: 'Tuition Shortage & Semester Retention',
      desc: 'Protects a vulnerable peer from dropping out of university when life hits hardest.',
      icon: Heart,
    },
  }

  return (
    <section className="relative overflow-hidden border-b border-border min-h-[680px] flex items-center justify-center">
      {/* Background Image Layer */}
      {hasBgImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
          style={{ backgroundImage: `url(${settings.hero_bg_image})` }}
        />
      ) : (
        /* Dynamic Mesh Gradient Default */
        <div className="absolute inset-0 bg-gradient-to-br from-bg-main via-brand-50/40 to-bg-main dark:from-bg-main dark:via-brand-900/15 dark:to-bg-main">
          <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-brand-600/10 blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -right-40 h-[480px] w-[480px] rounded-full bg-amber-500/10 blur-3xl animate-pulse" />
        </div>
      )}

      {/* Adaptive Theme Overlay for Readability */}
      {hasBgImage && (
        <div
          className="absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-r from-bg-main/95 via-bg-main/75 to-bg-main/30 dark:from-bg-main/95 dark:via-bg-main/80 dark:to-bg-main/40 transition-opacity duration-300"
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
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-600/30 bg-brand-50/80 dark:bg-brand-900/30 px-4 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-900 shadow-sm backdrop-blur-sm">
                <Sparkles size={14} className="text-brand-600 dark:text-brand-900" />
                <span>{settings.hero_badge}</span>
              </div>
            )}

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-text leading-[1.12]">
              {settings.hero_title || 'Transparent Class Contributions & Student Charity'}
            </h1>

            {/* Subtitle */}
            <p className="max-w-2xl mx-auto lg:mx-0 text-base sm:text-lg text-secondary leading-relaxed font-sans">
              {settings.hero_subtitle || 'A student-first mutual aid and contribution platform. Real-time contribution tracking, audited expense logs, and collective peer support.'}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Link
                to={settings.cta_primary_link || '/login'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-btn bg-brand-600 px-7 py-3.5 text-base font-semibold text-white shadow-md shadow-brand-600/25 hover:bg-brand-600/90 hover:shadow-lg hover:shadow-brand-600/30 active:scale-98 transition-all"
              >
                <span>{settings.cta_primary_text || 'Access Class Portal'}</span>
                <ArrowRight size={18} />
              </Link>

              <a
                href="#charity-pledge"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-btn border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/15 px-6 py-3.5 text-base font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 active:scale-98 transition-all backdrop-blur-sm"
              >
                <Heart size={16} className="fill-amber-500 text-amber-500" />
                <span>Read Student Mercy Pledge</span>
              </a>
            </div>

            {/* Trust Checklist */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-6 text-xs text-secondary font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle size={15} className="text-success shrink-0" />
                <span>100% Peer Audited Ledger</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-brand-600 shrink-0" />
                <span>Zero Stored Hidden Values</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={15} className="text-amber-500 shrink-0" />
                <span>Mutual Assistance for Classmates</span>
              </div>
            </div>
          </div>

          {/* Right Column: 3D ANIMATED CONTRIBUTION VAULT */}
          <div className="lg:col-span-5 flex justify-center perspective-[1200px]">
            <div
              ref={cardRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                transformStyle: 'preserve-3d',
                transition: 'transform 0.15s ease-out',
              }}
              className="relative w-full max-w-md rounded-2xl border-2 border-brand-600/30 bg-gradient-to-b from-bg-card/95 via-bg-card/90 to-brand-50/30 dark:to-brand-900/20 p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-6 select-none"
            >
              {/* Top 3D Floating Badge */}
              <div
                style={{ transform: 'translateZ(30px)' }}
                className="flex items-center justify-between border-b border-border pb-4"
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-md shadow-brand-600/30">
                    <Heart size={22} className="fill-white" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text">Student Solidarity Fund</h3>
                    <p className="text-xs text-muted">Collective Class Mutual Treasury</p>
                  </div>
                </div>

                <span className="rounded-full bg-brand-600/10 px-2.5 py-1 text-[11px] font-bold text-brand-600 dark:text-brand-900 border border-brand-600/20">
                  ✦ Active Pool
                </span>
              </div>

              {/* 3D Animated Contribution Orb Preview */}
              <div
                style={{ transform: 'translateZ(40px)' }}
                className="relative rounded-xl overflow-hidden border border-border/80 bg-gradient-to-br from-bg-elevated/70 via-bg-card to-brand-50/50 dark:to-brand-900/30 p-5 space-y-4"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-secondary">Simulate Your Impact:</span>
                  <span className="text-xs font-bold text-brand-600 dark:text-brand-900">
                    Direct Classmate Aid
                  </span>
                </div>

                {/* Tier Selection Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {[10, 25, 50].map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setSelectedTier(tier)}
                      className={`py-2 px-3 rounded-btn text-xs font-bold transition-all cursor-pointer ${
                        selectedTier === tier
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 scale-105'
                          : 'bg-bg-card border border-border text-secondary hover:bg-bg-elevated hover:text-text'
                      }`}
                    >
                      ${tier} Share
                    </button>
                  ))}
                </div>

                {/* Dynamic Tier Impact Reveal */}
                <div className="rounded-btn bg-bg-card border border-brand-600/20 p-3 space-y-1.5 transition-all">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/40 text-brand-600 shrink-0">
                      <Sparkles size={13} />
                    </span>
                    <p className="text-xs font-bold text-text">
                      {impactTiers[selectedTier].title}
                    </p>
                  </div>
                  <p className="text-[11px] text-secondary leading-relaxed pl-8">
                    {impactTiers[selectedTier].desc}
                  </p>
                </div>
              </div>

              {/* Live Mutual Assistance Guarantees */}
              <div
                style={{ transform: 'translateZ(25px)' }}
                className="grid grid-cols-2 gap-3 pt-1 text-center"
              >
                <div className="rounded-btn bg-bg-elevated p-2.5 border border-border/60">
                  <p className="text-[10px] text-muted font-medium">Class Participation</p>
                  <p className="text-sm font-bold text-text mt-0.5">100% Shared</p>
                </div>
                <div className="rounded-btn bg-bg-elevated p-2.5 border border-border/60">
                  <p className="text-[10px] text-muted font-medium">Unaccounted Loss</p>
                  <p className="text-sm font-bold text-success mt-0.5">$0.00 Guaranteed</p>
                </div>
              </div>

              {/* Bottom Quick Action */}
              <div style={{ transform: 'translateZ(35px)' }}>
                <Link
                  to="/login"
                  className="w-full flex items-center justify-center gap-2 rounded-btn bg-gradient-to-r from-brand-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:opacity-95 active:scale-98 transition-all"
                >
                  <Coins size={15} /> Log In To Submit Your Contribution
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
