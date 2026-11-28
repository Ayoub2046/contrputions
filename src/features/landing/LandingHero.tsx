import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Lock,
  CheckCircle2,
  Receipt,
  FileSpreadsheet,
  Phone,
  MessageSquareText,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react'
import type { LandingPageSettings } from '../../lib/types'

interface LandingHeroProps {
  settings: LandingPageSettings
}

type PreviewTab = 'card' | 'expenses' | 'private'

export function LandingHero({ settings }: LandingHeroProps) {
  const [activePreview, setActivePreview] = useState<PreviewTab>('card')

  const hasBgImage = Boolean(
    settings.hero_bg_image &&
      settings.hero_bg_image.trim() !== '' &&
      !settings.hero_bg_image.startsWith('data:image')
  )
  const overlayOpacity = Math.max(0.45, Math.min(0.95, (settings.hero_bg_overlay_opacity ?? 80) / 100))

  return (
    <section className="relative overflow-hidden border-b border-[#C6CACB]/80 dark:border-[#1D3552] bg-[#FFFFFF] dark:bg-[#08121E]">
      {/* Subtle architectural background photo if uploaded in CMS, with crisp dual-mode directional scrim */}
      {hasBgImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${settings.hero_bg_image})` }}
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#FFFFFF] via-[#FFFFFF]/92 to-[#FFFFFF]/70 dark:from-[#08121E] dark:via-[#08121E]/92 dark:to-[#08121E]/75 transition-opacity duration-500"
            style={{ opacity: overlayOpacity }}
          />
        </>
      )}

      {/* Subtle architectural grid lines — zero AI glow blobs */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #1176BC 1px, transparent 1px), linear-gradient(to bottom, #1176BC 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:py-24 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Grounded, Human Institutional Copy */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 border border-[#C6CACB] dark:border-[#1D3552] bg-[#ECECEC]/65 dark:bg-[#0E1D31] px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#1176BC] dark:text-[#25A8E0]">
              <GraduationCap size={14} className="shrink-0" />
              <span>{settings.hero_badge || 'ZUST & Baidoa University • Student Class Portal'}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.35rem] font-serif font-bold tracking-tight text-[#0B1A2B] dark:text-[#FFFFFF] leading-[1.08]">
              {settings.hero_title || 'Clear class records, kept respectfully.'}
            </h1>

            <p className="max-w-xl text-base sm:text-lg text-[#2F465E] dark:text-[#DCE8F5] leading-relaxed font-sans">
              {settings.hero_subtitle ||
                'No lost notebooks or confusing group chat screenshots. Log in with your Student ID to check your contribution balance, review every class expense, print receipts, and speak privately with your class leader.'}
            </p>

            {/* Clean Primary & Secondary Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <Link
                to={settings.cta_primary_link || '/login'}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1176BC] hover:bg-[#0D5E97] px-6 py-3.5 text-sm font-bold text-[#FFFFFF] shadow-sm transition-colors"
              >
                <span>{settings.cta_primary_text || 'Student Sign In'}</span>
                <ArrowRight size={16} />
              </Link>

              <Link
                to={settings.cta_secondary_link || '/login'}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#C6CACB] dark:border-[#1D3552] bg-[#FFFFFF] dark:bg-[#0E1D31] hover:border-[#1176BC] dark:hover:border-[#25A8E0] px-6 py-3.5 text-sm font-bold text-[#0B1A2B] dark:text-[#FFFFFF] transition-colors"
              >
                <span>{settings.cta_secondary_text || 'Class Admin Portal'}</span>
              </Link>
            </div>

            {/* Quiet Factual Assurances — crisp editorial row */}
            <div className="pt-4 border-t border-[#ECECEC] dark:border-[#1D3552] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#2F465E] dark:text-[#C6CACB]">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[#1176BC] dark:text-[#25A8E0] shrink-0" />
                <span className="font-medium">Personal login per student</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-[#1176BC] dark:text-[#25A8E0] shrink-0" />
                <span className="font-medium">Private leader messages</span>
              </div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={14} className="text-[#1176BC] dark:text-[#25A8E0] shrink-0" />
                <span className="font-medium">Printable PDF receipts</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Real-Workflow Preview */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-[#C6CACB] dark:border-[#1D3552] bg-[#FFFFFF] dark:bg-[#0E1D31] shadow-xl shadow-[#1176BC]/8 dark:shadow-black/40 overflow-hidden">
              {/* Interactive Tab Header */}
              <div className="px-4 py-3 border-b border-[#ECECEC] dark:border-[#1D3552] bg-[#ECECEC]/45 dark:bg-[#08121E] flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#2F465E] dark:text-[#9FBBDE]">
                  Inside Your Account
                </span>

                <div className="flex items-center gap-1 p-1 rounded-lg bg-[#FFFFFF] dark:bg-[#0E1D31] border border-[#C6CACB]/80 dark:border-[#1D3552]">
                  {(
                    [
                      { id: 'card', label: 'Student Pass' },
                      { id: 'expenses', label: 'Class Expenses' },
                      { id: 'private', label: 'Private Line' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActivePreview(t.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                        activePreview === t.id
                          ? 'bg-[#1176BC] text-[#FFFFFF]'
                          : 'text-[#2F465E] dark:text-[#C6CACB] hover:text-[#0B1A2B] dark:hover:text-[#FFFFFF]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content Area */}
              <div className="p-5 sm:p-6 min-h-[340px] flex flex-col justify-between bg-[#FFFFFF] dark:bg-[#0E1D31]">
                {activePreview === 'card' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-gradient-to-br from-[#0A4673] via-[#1176BC] to-[#25A8E0] p-5 text-[#FFFFFF] space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-[#FFFFFF]/80 font-semibold block">
                            Example Student View
                          </span>
                          <h3 className="text-lg font-bold text-[#FFFFFF] mt-0.5">Public Health &bull; Batch 6</h3>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-[#FFFFFF] text-[#1176BC] text-[10px] font-bold uppercase tracking-wider shrink-0">
                          Cleared
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-left pt-1">
                        <div className="rounded-xl bg-[#FFFFFF]/15 p-2.5">
                          <span className="text-[10px] text-[#FFFFFF]/80 block">Paid</span>
                          <span className="text-base font-serif font-bold text-[#FFFFFF]">$25.00</span>
                        </div>
                        <div className="rounded-xl bg-[#FFFFFF]/15 p-2.5">
                          <span className="text-[10px] text-[#FFFFFF]/80 block">Target</span>
                          <span className="text-base font-serif font-bold text-[#FFFFFF]">$25.00</span>
                        </div>
                        <div className="rounded-xl bg-[#FFFFFF]/15 p-2.5">
                          <span className="text-[10px] text-[#FFFFFF]/80 block">Remaining</span>
                          <span className="text-base font-serif font-bold text-[#FFFFFF]">$0.00</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="h-2 w-full rounded-full bg-[#082B47]/60 overflow-hidden">
                          <div className="h-full w-full rounded-full bg-[#FFFFFF]" />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#FFFFFF]/90 font-medium">
                          <span>100% Semester Clearance</span>
                          <span>Updated live on payment</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#2F465E] dark:text-[#C6CACB] px-1">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-[#1176BC] dark:text-[#25A8E0]" />
                        Only you see your personal record
                      </span>
                      <span className="font-mono font-semibold text-[#1176BC] dark:text-[#25A8E0]">
                        PDF Receipt Ready
                      </span>
                    </div>
                  </div>
                )}

                {activePreview === 'expenses' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
                          How Class Contributions Are Spent
                        </h3>
                        <p className="text-xs text-[#52677D] dark:text-[#C6CACB]">
                          Every receipt and course material purchase is logged with dates.
                        </p>
                      </div>
                      <Receipt size={18} className="text-[#1176BC] dark:text-[#25A8E0] shrink-0" />
                    </div>

                    <div className="divide-y divide-[#ECECEC] dark:divide-[#1D3552] border border-[#ECECEC] dark:border-[#1D3552] rounded-xl overflow-hidden">
                      {[
                        {
                          title: 'Course Handouts & Lab Guides Printing',
                          date: 'Verified Receipt #104',
                          amount: '-$42.00',
                        },
                        {
                          title: 'Exam Clearance & Answer Sheet Booklets',
                          date: 'Verified Receipt #103',
                          amount: '-$28.50',
                        },
                        {
                          title: 'Fieldwork Supplies & Seminar Materials',
                          date: 'Verified Receipt #102',
                          amount: '-$35.00',
                        },
                      ].map((row) => (
                        <div
                          key={row.title}
                          className="p-3.5 bg-[#FFFFFF] dark:bg-[#08121E]/60 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-[#0B1A2B] dark:text-[#FFFFFF] truncate">
                              {row.title}
                            </p>
                            <span className="text-[11px] text-[#52677D] dark:text-[#9FBBDE]">{row.date}</span>
                          </div>
                          <span className="text-xs sm:text-sm font-mono font-bold text-[#DC2626] dark:text-[#F87171] shrink-0">
                            {row.amount}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-[#52677D] dark:text-[#C6CACB]">
                      Net class balance updates automatically—no hidden arithmetic.
                    </p>
                  </div>
                )}

                {activePreview === 'private' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
                          Confidential Line to Your Class Leader
                        </h3>
                        <p className="text-xs text-[#52677D] dark:text-[#C6CACB]">
                          Private messages never appear on public group discussions.
                        </p>
                      </div>
                      <Lock size={16} className="text-[#1176BC] dark:text-[#25A8E0] shrink-0" />
                    </div>

                    <div className="space-y-2.5 rounded-xl bg-[#ECECEC]/40 dark:bg-[#08121E] border border-[#ECECEC] dark:border-[#1D3552] p-3.5">
                      <div className="ml-6 rounded-xl bg-[#1176BC] text-[#FFFFFF] p-3 text-xs leading-relaxed shadow-xs">
                        <span className="text-[10px] font-bold text-[#FFFFFF]/80 block mb-0.5">
                          Student (Private to Class Admin)
                        </span>
                        &ldquo;Salaam brother, I paid my $25 contribution via EVC Plus reference #TX9841. Could you check and clear my pass before Friday?&rdquo;
                      </div>
                      <div className="mr-6 rounded-xl bg-[#FFFFFF] dark:bg-[#0E1D31] border border-[#C6CACB]/80 dark:border-[#1D3552] p-3 text-xs text-[#0B1A2B] dark:text-[#FFFFFF] leading-relaxed shadow-xs">
                        <span className="text-[10px] font-bold text-[#1176BC] dark:text-[#25A8E0] block mb-0.5">
                          Assigned Class Admin Reply
                        </span>
                        &ldquo;Wa alaykum salaam! Verified and logged just now. Your Semester Clearance Pass is 100% ready to download or print.&rdquo;
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ECECEC] dark:bg-[#08121E] text-[#0B1A2B] dark:text-[#FFFFFF] border border-[#C6CACB]/70 dark:border-[#1D3552]">
                        <Phone size={12} className="text-[#1176BC] dark:text-[#25A8E0]" /> Call Class Admin
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ECECEC] dark:bg-[#08121E] text-[#0B1A2B] dark:text-[#FFFFFF] border border-[#C6CACB]/70 dark:border-[#1D3552]">
                        <MessageSquareText size={12} className="text-[#25A8E0]" /> SMS / WhatsApp
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-4 mt-4 border-t border-[#ECECEC] dark:border-[#1D3552] flex items-center justify-between gap-3">
                  <span className="text-[11px] text-[#52677D] dark:text-[#9FBBDE] font-medium">
                    Ready to check your own class balance?
                  </span>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#1176BC] dark:text-[#25A8E0] hover:underline shrink-0"
                  >
                    Go to Login <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
