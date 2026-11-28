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
  Lock,
} from 'lucide-react'
import type { LandingPageSettings } from '../../lib/types'

interface LandingHeroProps {
  settings: LandingPageSettings
}

export function LandingHero({ settings }: LandingHeroProps) {
  const hasBgImage = Boolean(settings.hero_bg_image && settings.hero_bg_image.trim() !== '')
  const opacityPercent = settings.hero_bg_overlay_opacity ?? 85
  // Keep readable floor so dark/light text always maintains WCAG contrast over any photo
  const overlayOpacity = Math.max(0.72, Math.min(0.96, opacityPercent / 100))

  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    setTilt({
      x: -(y / (rect.height / 2)) * 8,
      y: (x / (rect.width / 2)) * 8,
    })
  }

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 })

  const [selectedTier, setSelectedTier] = useState<number>(25)

  const impactTiers: Record<number, { title: string; desc: string; icon: typeof Coins }> = {
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
    <section className="relative overflow-hidden border-b border-[#ECECEC] dark:border-[#203854] bg-[#FFFFFF] dark:bg-[#09131F] min-h-[660px] flex items-center justify-center">
      {/* Subtle Architectural Background Layer */}
      {hasBgImage ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
            style={{ backgroundImage: `url(${settings.hero_bg_image})` }}
          />
          <div
            className="absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-r from-[#FFFFFF] via-[#FFFFFF]/95 to-[#EAF4FB]/85 dark:from-[#09131F] dark:via-[#09131F]/94 dark:to-[#102033]/85"
            style={{ opacity: overlayOpacity }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFFFFF] via-[#F4F8FC] to-[#9FBBDE]/25 dark:from-[#09131F] dark:via-[#0D1B2C] dark:to-[#1176BC]/20" />
      )}

      {/* Controlled Palette Glows (#1176BC, #25A8E0, #9FBBDE) */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-[#25A8E0]/12 dark:bg-[#25A8E0]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 -right-24 h-[460px] w-[460px] rounded-full bg-[#1176BC]/12 dark:bg-[#1176BC]/20 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #1176BC 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Content Container */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:py-20 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          {/* Left Column: Editorial Headline & Clear CTAs */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6">
            {settings.hero_badge && (
              <div className="inline-flex items-center gap-2 rounded-full border border-[#9FBBDE] dark:border-[#25A8E0]/40 bg-[#FFFFFF]/90 dark:bg-[#102033]/90 px-4 py-1.5 text-xs font-bold text-[#1176BC] dark:text-[#25A8E0] shadow-xs backdrop-blur-sm">
                <Sparkles size={14} className="text-[#25A8E0] shrink-0" />
                <span>{settings.hero_badge}</span>
              </div>
            )}

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-serif font-bold tracking-tight text-[#0B1A2B] dark:text-[#FFFFFF] leading-[1.08]">
              {settings.hero_title || 'Transparent Class Contributions & Student Charity'}
            </h1>

            <p className="max-w-2xl mx-auto lg:mx-0 text-base sm:text-lg text-[#2F465E] dark:text-[#DCE8F5] leading-relaxed font-sans font-normal">
              {settings.hero_subtitle ||
                'A student-first mutual aid and contribution platform. Real-time contribution tracking, audited expense logs, and collective peer support so no classmate is left behind.'}
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Link
                to={settings.cta_primary_link || '/login'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1176BC] to-[#25A8E0] px-7 py-3.5 text-base font-semibold text-[#FFFFFF] shadow-lg shadow-[#1176BC]/25 hover:shadow-xl hover:opacity-95 active:scale-98 transition-all"
              >
                <span>{settings.cta_primary_text || 'Access Class Portal'}</span>
                <ArrowRight size={18} />
              </Link>

              <a
                href={settings.cta_secondary_link || '#charity-pledge'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#C6CACB] dark:border-[#9FBBDE]/35 bg-[#FFFFFF]/95 dark:bg-[#102033]/90 px-6 py-3.5 text-base font-semibold text-[#1176BC] dark:text-[#FFFFFF] hover:bg-[#ECECEC]/70 dark:hover:bg-[#172D47] hover:border-[#1176BC] dark:hover:border-[#25A8E0] active:scale-98 transition-all shadow-xs"
              >
                <Heart size={16} className="text-[#25A8E0] fill-[#25A8E0]/20" />
                <span>{settings.cta_secondary_text || 'Read Student Mercy Pledge'}</span>
              </a>
            </div>

            {/* Trust Metrics Pill Strip */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-y-2.5 gap-x-5 text-xs font-semibold text-[#2F465E] dark:text-[#C6CACB]">
              <div className="flex items-center gap-1.5">
                <CheckCircle size={15} className="text-[#0C9B5E] dark:text-[#22C55E] shrink-0" />
                <span>100% Peer Audited Ledger</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-[#1176BC] dark:text-[#25A8E0] shrink-0" />
                <span>Zero Stored Balances</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={15} className="text-[#25A8E0] shrink-0" />
                <span>Mutual Classmate Support</span>
              </div>
            </div>
          </div>

          {/* Right Column: Executive Ocean-Blue Fintech Card Centerpiece */}
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
              className="relative w-full max-w-md rounded-3xl border border-[#9FBBDE]/60 dark:border-[#25A8E0]/40 bg-[#FFFFFF] dark:bg-[#102033] p-5 sm:p-6 shadow-2xl shadow-[#1176BC]/15 dark:shadow-black/50 space-y-5 select-none"
            >
              {/* Top Ocean Banner inside Card */}
              <div
                style={{ transform: 'translateZ(20px)' }}
                className="rounded-2xl bg-gradient-to-br from-[#0A4673] via-[#1176BC] to-[#25A8E0] p-4 sm:p-5 text-[#FFFFFF] shadow-md relative overflow-hidden"
              >
                <div className="absolute -right-8 -top-8 size-32 rounded-full bg-[#FFFFFF]/10 blur-xl pointer-events-none" />
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-[#FFFFFF]/15 border border-[#FFFFFF]/25 backdrop-blur-sm">
                      <Heart size={21} className="text-[#FFFFFF] fill-[#FFFFFF]/25" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#FFFFFF]">Student Solidarity Vault</h3>
                      <p className="text-xs text-[#FFFFFF]/80">Collective Class Mutual Treasury</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFFFF]/20 border border-[#FFFFFF]/30 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF] shrink-0">
                    <span className="size-1.5 rounded-full bg-[#FFFFFF] animate-pulse" />
                    Live
                  </span>
                </div>
              </div>

              {/* Impact Simulator Panel */}
              <div
                style={{ transform: 'translateZ(30px)' }}
                className="rounded-2xl border border-[#ECECEC] dark:border-[#203854] bg-[#F4F8FC] dark:bg-[#0D1B2C] p-4 space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
                    Simulate Your Impact
                  </span>
                  <span className="text-[11px] font-bold text-[#1176BC] dark:text-[#25A8E0]">
                    Direct Classmate Aid
                  </span>
                </div>

                {/* Tier Pills */}
                <div className="grid grid-cols-3 gap-2">
                  {[10, 25, 50].map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setSelectedTier(tier)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        selectedTier === tier
                          ? 'bg-gradient-to-r from-[#1176BC] to-[#25A8E0] border-transparent text-[#FFFFFF] shadow-md shadow-[#1176BC]/25'
                          : 'bg-[#FFFFFF] dark:bg-[#172D47] border-[#C6CACB] dark:border-[#203854] text-[#0B1A2B] dark:text-[#FFFFFF] hover:border-[#1176BC] dark:hover:border-[#25A8E0]'
                      }`}
                    >
                      ${tier} Share
                    </button>
                  ))}
                </div>

                {/* Tier Description */}
                <div className="rounded-xl bg-[#FFFFFF] dark:bg-[#102033] border border-[#ECECEC] dark:border-[#203854] p-3.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-lg bg-[#9FBBDE]/25 dark:bg-[#172D47] text-[#1176BC] dark:text-[#25A8E0] shrink-0">
                      <Sparkles size={13} />
                    </span>
                    <p className="text-xs font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
                      {impactTiers[selectedTier].title}
                    </p>
                  </div>
                  <p className="text-[11px] text-[#2F465E] dark:text-[#C6CACB] leading-relaxed pl-8">
                    {impactTiers[selectedTier].desc}
                  </p>
                </div>
              </div>

              {/* Dual Guarantees */}
              <div
                style={{ transform: 'translateZ(20px)' }}
                className="grid grid-cols-2 gap-3"
              >
                <div className="rounded-xl bg-[#ECECEC]/75 dark:bg-[#172D47] p-3 border border-[#C6CACB]/60 dark:border-[#203854] text-center">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-[#52677D] dark:text-[#9FBBDE]">
                    Class Participation
                  </p>
                  <p className="text-sm font-bold text-[#0B1A2B] dark:text-[#FFFFFF] mt-0.5">100% Shared</p>
                </div>
                <div className="rounded-xl bg-[#ECECEC]/75 dark:bg-[#172D47] p-3 border border-[#C6CACB]/60 dark:border-[#203854] text-center">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-[#52677D] dark:text-[#9FBBDE]">
                    Unaccounted Loss
                  </p>
                  <p className="text-sm font-bold text-[#0C9B5E] dark:text-[#22C55E] mt-0.5">$0.00 Verified</p>
                </div>
              </div>

              {/* Bottom CTA inside Card */}
              <div style={{ transform: 'translateZ(25px)' }} className="space-y-2">
                <Link
                  to="/login"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1176BC] to-[#25A8E0] py-3 text-xs font-bold text-[#FFFFFF] shadow-md hover:opacity-95 active:scale-98 transition-all"
                >
                  <Coins size={15} /> Log In To Check Your Class Balance
                </Link>
                <p className="flex items-center justify-center gap-1.5 text-[10px] font-medium text-[#52677D] dark:text-[#C6CACB]">
                  <Lock size={11} className="text-[#1176BC] dark:text-[#25A8E0]" />
                  <span>Protected by PostgreSQL Row-Level Security</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
