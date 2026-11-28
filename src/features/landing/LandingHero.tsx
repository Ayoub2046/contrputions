import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Users,
  Receipt,
  Lock,
  GraduationCap,
  Sparkles,
  PhoneCall,
  FileSpreadsheet,
} from 'lucide-react'
import type { LandingPageSettings } from '../../lib/types'

interface LandingHeroProps {
  settings: LandingPageSettings
}

export function LandingHero({ settings }: LandingHeroProps) {
  const hasBgImage = Boolean(settings.hero_bg_image && settings.hero_bg_image.trim() !== '')
  const overlayOpacity = Math.max(0.75, Math.min(0.96, (settings.hero_bg_overlay_opacity ?? 85) / 100))

  return (
    <section className="relative overflow-hidden border-b border-[#ECECEC] dark:border-[#203854] bg-[#FFFFFF] dark:bg-[#09131F] min-h-[640px] flex items-center justify-center">
      {/* Background Layer */}
      {hasBgImage ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
            style={{ backgroundImage: `url(${settings.hero_bg_image})` }}
          />
          <div
            className="absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-r from-[#FFFFFF] via-[#FFFFFF]/95 to-[#EAF4FB]/90 dark:from-[#09131F] dark:via-[#09131F]/95 dark:to-[#102033]/90"
            style={{ opacity: overlayOpacity }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFFFFF] via-[#F4F8FC] to-[#9FBBDE]/20 dark:from-[#09131F] dark:via-[#0D1B2C] dark:to-[#1176BC]/20" />
      )}

      {/* Subtle Brand Atmosphere */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-[#25A8E0]/10 dark:bg-[#25A8E0]/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 -right-24 h-[460px] w-[460px] rounded-full bg-[#1176BC]/10 dark:bg-[#1176BC]/15 blur-3xl" />

      {/* Content Container */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:py-20 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          {/* Left Column: Authentic, Humanized Headline & Action Hub */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#9FBBDE] dark:border-[#25A8E0]/40 bg-[#FFFFFF]/90 dark:bg-[#102033]/90 px-4 py-1.5 text-xs font-bold text-[#1176BC] dark:text-[#25A8E0] shadow-xs backdrop-blur-sm">
              <Sparkles size={14} className="text-[#25A8E0] shrink-0" />
              <span>{settings.hero_badge || 'ZUST & Baidoa University • Student Class Portal'}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-serif font-bold tracking-tight text-[#0B1A2B] dark:text-[#FFFFFF] leading-[1.12]">
              {settings.hero_title || 'Transparent Class Contributions & Audited Ledger'}
            </h1>

            <p className="max-w-2xl mx-auto lg:mx-0 text-base sm:text-lg text-[#2F465E] dark:text-[#DCE8F5] leading-relaxed font-sans font-normal">
              {settings.hero_subtitle ||
                'A verified, community-powered platform for our university class. Track contributions, inspect itemized course handouts & practical expenses, download official receipts, and reach your class leadership with complete privacy.'}
            </p>

            {/* Direct Dual-Portal Access Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 text-left">
              <Link
                to="/login"
                className="group p-4 rounded-2xl border border-[#9FBBDE]/60 dark:border-[#203854] bg-[#FFFFFF] dark:bg-[#102033] hover:border-[#1176BC] dark:hover:border-[#25A8E0] shadow-sm hover:shadow-md transition-all block"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="size-9 rounded-xl bg-[#1176BC]/10 dark:bg-[#1176BC]/25 text-[#1176BC] dark:text-[#25A8E0] flex items-center justify-center font-bold">
                    <GraduationCap size={18} />
                  </div>
                  <span className="text-[11px] font-bold text-[#1176BC] dark:text-[#25A8E0] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Student Login <ArrowRight size={12} />
                  </span>
                </div>
                <h2 className="text-sm font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">Student Portal</h2>
                <p className="text-xs text-[#52677D] dark:text-[#C6CACB] mt-1 leading-relaxed">
                  Log in with your Student ID to check your payments, download official receipts, and contact your class leader.
                </p>
              </Link>

              <Link
                to="/login"
                className="group p-4 rounded-2xl border border-[#ECECEC] dark:border-[#203854] bg-[#FFFFFF] dark:bg-[#102033] hover:border-[#25A8E0] shadow-sm hover:shadow-md transition-all block"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="size-9 rounded-xl bg-[#25A8E0]/10 dark:bg-[#25A8E0]/20 text-[#25A8E0] flex items-center justify-center font-bold">
                    <ShieldCheck size={18} />
                  </div>
                  <span className="text-[11px] font-bold text-[#25A8E0] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Admin Portal <ArrowRight size={12} />
                  </span>
                </div>
                <h2 className="text-sm font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">Class Leadership</h2>
                <p className="text-xs text-[#52677D] dark:text-[#C6CACB] mt-1 leading-relaxed">
                  Record student payments, document class handouts &amp; practical expenses, and export PDF audit statements.
                </p>
              </Link>
            </div>

            {/* Grounded Trust Signals */}
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-y-2.5 gap-x-5 text-xs font-semibold text-[#2F465E] dark:text-[#C6CACB]">
              <div className="flex items-center gap-1.5">
                <CheckCircle size={15} className="text-[#0C9B5E] dark:text-[#22C55E] shrink-0" />
                <span>Audited PostgreSQL Ledger</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock size={14} className="text-[#1176BC] dark:text-[#25A8E0] shrink-0" />
                <span>100% Confidential Student Messaging</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={15} className="text-[#25A8E0] shrink-0" />
                <span>Zero Hidden Calculations</span>
              </div>
            </div>
          </div>

          {/* Right Column: Authentic Live Class Ledger Showcase */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md rounded-3xl border border-[#9FBBDE]/60 dark:border-[#203854] bg-[#FFFFFF] dark:bg-[#102033] p-5 sm:p-6 shadow-xl shadow-[#1176BC]/10 dark:shadow-black/40 space-y-5">
              {/* Top Institutional Header */}
              <div className="rounded-2xl bg-gradient-to-br from-[#08385E] via-[#1176BC] to-[#25A8E0] p-4 sm:p-5 text-[#FFFFFF] shadow-md relative overflow-hidden">
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-[#FFFFFF]/80">
                      University of Baidoa • Class Fund
                    </span>
                    <h2 className="text-base font-bold text-[#FFFFFF]">Public Health &amp; Science</h2>
                    <p className="text-xs text-[#FFFFFF]/85">Active Semester Contribution Vault</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFFFF]/20 border border-[#FFFFFF]/30 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase text-[#FFFFFF] shrink-0">
                    <span className="size-1.5 rounded-full bg-[#FFFFFF] animate-pulse" />
                    Audited
                  </span>
                </div>
              </div>

              {/* 3 Live Accounting Pillars */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-[#F4F8FC] dark:bg-[#0D1B2C] border border-[#ECECEC] dark:border-[#203854] p-3 space-y-0.5">
                  <span className="text-[10px] font-bold text-[#52677D] dark:text-[#9FBBDE] uppercase block">
                    Collected
                  </span>
                  <span className="text-sm sm:text-base font-bold font-serif text-[#1176BC] dark:text-[#25A8E0]">
                    100%
                  </span>
                  <span className="text-[9px] text-[#52677D] dark:text-[#C6CACB] block">Recorded</span>
                </div>

                <div className="rounded-xl bg-[#F4F8FC] dark:bg-[#0D1B2C] border border-[#ECECEC] dark:border-[#203854] p-3 space-y-0.5">
                  <span className="text-[10px] font-bold text-[#52677D] dark:text-[#9FBBDE] uppercase block">
                    Expenses
                  </span>
                  <span className="text-sm sm:text-base font-bold font-serif text-amber-600 dark:text-amber-400">
                    Itemized
                  </span>
                  <span className="text-[9px] text-[#52677D] dark:text-[#C6CACB] block">Handouts</span>
                </div>

                <div className="rounded-xl bg-[#F4F8FC] dark:bg-[#0D1B2C] border border-[#ECECEC] dark:border-[#203854] p-3 space-y-0.5">
                  <span className="text-[10px] font-bold text-[#52677D] dark:text-[#9FBBDE] uppercase block">
                    Balance
                  </span>
                  <span className="text-sm sm:text-base font-bold font-serif text-[#0C9B5E] dark:text-[#22C55E]">
                    Audited
                  </span>
                  <span className="text-[9px] text-[#52677D] dark:text-[#C6CACB] block">Real-time</span>
                </div>
              </div>

              {/* Key Features Quick List */}
              <div className="rounded-2xl border border-[#ECECEC] dark:border-[#203854] bg-[#F4F8FC] dark:bg-[#0D1B2C] p-4 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-[#1176BC]/10 dark:bg-[#1176BC]/25 text-[#1176BC] dark:text-[#25A8E0] flex items-center justify-center shrink-0">
                    <Receipt size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">Personal Clearance &amp; Receipts</p>
                    <p className="text-[11px] text-[#52677D] dark:text-[#C6CACB]">Each student has a private account with verified payment proof.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-[#25A8E0]/10 dark:bg-[#25A8E0]/20 text-[#25A8E0] flex items-center justify-center shrink-0">
                    <PhoneCall size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">Direct Leadership Contact</p>
                    <p className="text-[11px] text-[#52677D] dark:text-[#C6CACB]">Call, SMS, WhatsApp, or write a confidential message to your class admin.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-[#0C9B5E]/10 dark:bg-[#0C9B5E]/20 text-[#0C9B5E] dark:text-[#22C55E] flex items-center justify-center shrink-0">
                    <FileSpreadsheet size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">1-Click Financial Statement</p>
                    <p className="text-[11px] text-[#52677D] dark:text-[#C6CACB]">Unalterable PDF export for class meetings and university reviews.</p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Link
                to="/login"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1176BC] to-[#25A8E0] py-3 text-xs font-bold text-[#FFFFFF] shadow-md hover:opacity-95 active:scale-98 transition-all"
              >
                Sign In to View Your Contribution Status <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
