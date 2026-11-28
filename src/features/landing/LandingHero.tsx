import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Lock,
  Receipt,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react'
import type { LandingPageSettings } from '../../lib/types'

interface LandingHeroProps {
  settings: LandingPageSettings
}

export function LandingHero({ settings }: LandingHeroProps) {
  const hasBgImage = Boolean(settings.hero_bg_image && settings.hero_bg_image.trim() !== '')

  return (
    <section className="relative overflow-hidden min-h-[580px] sm:min-h-[640px] flex items-center border-b border-[#ECECEC] dark:border-[#1E3048] bg-[#F4F8FC] dark:bg-[#08121E]">
      {/* 1. Clear University Background Photo */}
      {hasBgImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
            style={{ backgroundImage: `url(${settings.hero_bg_image})` }}
          />
          {/* Subtle Directional Scrim: Clear on right so background shows beautifully, readable on left */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#FFFFFF]/95 via-[#FFFFFF]/85 to-[#FFFFFF]/30 dark:from-[#08121E]/95 dark:via-[#08121E]/85 dark:to-[#08121E]/40"
          />
          {/* Bottom ground blend */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#FFFFFF] dark:from-[#08121E] to-transparent" />
        </>
      )}

      {/* Content Container */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:py-24 lg:py-28 sm:px-6 lg:px-8 w-full">
        <div className="max-w-2xl lg:max-w-3xl space-y-6 text-left">
          {/* University Tag Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFFFFF]/90 dark:bg-[#102033]/90 backdrop-blur-md border border-[#1176BC]/30 dark:border-[#25A8E0]/40 text-xs font-bold text-[#1176BC] dark:text-[#25A8E0] shadow-sm">
            <GraduationCap size={16} className="shrink-0 text-[#1176BC] dark:text-[#25A8E0]" />
            <span>{settings.hero_badge || 'ZUST & Baidoa University • Student Class Portal'}</span>
          </div>

          {/* Main Headline — Bold, Modern, High Contrast */}
          <h1 className="text-4xl sm:text-5xl lg:text-[3.6rem] font-sans font-extrabold tracking-tight text-[#0B1A2B] dark:text-[#FFFFFF] leading-[1.1]">
            Clear class finances. <br />
            <span className="bg-gradient-to-r from-[#1176BC] via-[#1E88E5] to-[#25A8E0] bg-clip-text text-transparent">
              Honest records.
            </span> <br />
            Respect for every student.
          </h1>

          {/* Subtitle */}
          <p className="max-w-xl text-base sm:text-lg text-[#2F465E] dark:text-[#CBD5E1] leading-relaxed font-sans font-medium">
            No lost notebooks, no awkward WhatsApp group shaming, and zero confusion.
            Check your personal semester balance, inspect itemized course handout and exam expenses,
            and message your class representative in 100% confidential privacy.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
            <Link
              to={settings.cta_primary_link || '/login'}
              className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#1176BC] to-[#25A8E0] hover:from-[#0D5E97] hover:to-[#1D96CA] text-[#FFFFFF] px-8 py-4 text-base font-bold shadow-xl shadow-[#1176BC]/30 transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>{settings.cta_primary_text || 'Student Sign In'}</span>
              <ArrowRight size={18} />
            </Link>

            <Link
              to={settings.cta_secondary_link || '/login'}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFFFFF]/90 dark:bg-[#102033]/90 backdrop-blur-md hover:bg-[#FFFFFF] dark:hover:bg-[#172D47] border border-[#C6CACB] dark:border-[#203854] text-[#0B1A2B] dark:text-[#FFFFFF] px-7 py-4 text-base font-bold shadow-sm transition-colors"
            >
              <span>{settings.cta_secondary_text || 'Class Admin Portal'}</span>
            </Link>
          </div>

          {/* Reassurance Row */}
          <div className="pt-4 border-t border-[#0B1A2B]/10 dark:border-[#FFFFFF]/10 flex flex-wrap items-center gap-5 text-xs sm:text-sm font-semibold text-[#2F465E] dark:text-[#CBD5E1]">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFFFF]/75 dark:bg-[#102033]/75 backdrop-blur-sm border border-[#ECECEC] dark:border-[#203854]">
              <Lock size={15} className="text-[#1176BC] dark:text-[#25A8E0]" />
              100% Confidential Private Line
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFFFF]/75 dark:bg-[#102033]/75 backdrop-blur-sm border border-[#ECECEC] dark:border-[#203854]">
              <Receipt size={15} className="text-[#1176BC] dark:text-[#25A8E0]" />
              Itemized Handouts &amp; Exams
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFFFF]/75 dark:bg-[#102033]/75 backdrop-blur-sm border border-[#ECECEC] dark:border-[#203854]">
              <ShieldCheck size={15} className="text-[#0C9B5E] dark:text-[#22C55E]" />
              Printable PDF Passes
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
