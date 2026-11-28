import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Lock,
  Receipt,
  Phone,
  MessageSquareText,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Cpu,
} from 'lucide-react'
import type { LandingPageSettings } from '../../lib/types'

interface LandingHeroProps {
  settings: LandingPageSettings
}

type PreviewTab = 'card' | 'private' | 'expenses'

export function LandingHero({ settings }: LandingHeroProps) {
  const [activePreview, setActivePreview] = useState<PreviewTab>('card')

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#F4F8FC] via-[#FFFFFF] to-[#EEF5FB] dark:from-[#08121E] dark:via-[#0B192C] dark:to-[#08121E] border-b border-[#ECECEC] dark:border-[#1E3048]">
      {/* Soft Ambient Radial Glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 size-[500px] rounded-full bg-[#1176BC]/10 dark:bg-[#1176BC]/20 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/2 -right-40 size-[450px] rounded-full bg-[#25A8E0]/10 dark:bg-[#25A8E0]/20 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:py-20 lg:py-24 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* Left Column: Human, Dignified, University Class Copy */}
          <div className="lg:col-span-6 space-y-6 text-left">
            {/* University Tag Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1176BC]/10 dark:bg-[#25A8E0]/15 border border-[#1176BC]/25 dark:border-[#25A8E0]/30 text-xs font-bold text-[#1176BC] dark:text-[#25A8E0] shadow-2xs">
              <GraduationCap size={15} className="shrink-0 text-[#1176BC] dark:text-[#25A8E0]" />
              <span>{settings.hero_badge || 'ZUST & Baidoa University • Student Class Portal'}</span>
            </div>

            {/* Main Headline — Modern, Crisp, Bold */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-sans font-extrabold tracking-tight text-[#0B1A2B] dark:text-[#FFFFFF] leading-[1.12]">
              Clear class finances. <br />
              <span className="bg-gradient-to-r from-[#1176BC] via-[#1E88E5] to-[#25A8E0] bg-clip-text text-transparent">
                Honest records.
              </span> <br />
              Respect for every student.
            </h1>

            {/* Human Subtitle */}
            <p className="max-w-xl text-base sm:text-lg text-[#2F465E] dark:text-[#CBD5E1] leading-relaxed font-sans">
              No lost notebooks, no awkward WhatsApp group shaming, and zero confusion.
              Check your personal semester balance, inspect itemized course handout and exam expenses,
              and message your class representative in 100% confidential privacy.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <Link
                to={settings.cta_primary_link || '/login'}
                className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#1176BC] to-[#25A8E0] hover:from-[#0D5E97] hover:to-[#1D96CA] text-[#FFFFFF] px-7 py-4 text-sm font-bold shadow-lg shadow-[#1176BC]/25 transition-all active:scale-[0.98] cursor-pointer"
              >
                <span>{settings.cta_primary_text || 'Student Sign In'}</span>
                <ArrowRight size={17} />
              </Link>

              <Link
                to={settings.cta_secondary_link || '/login'}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFFFFF] dark:bg-[#102033] hover:bg-[#F4F8FC] dark:hover:bg-[#172D47] border border-[#C6CACB] dark:border-[#203854] text-[#0B1A2B] dark:text-[#FFFFFF] px-6 py-4 text-sm font-bold shadow-xs transition-colors"
              >
                <span>{settings.cta_secondary_text || 'Class Admin Portal'}</span>
              </Link>
            </div>

            {/* Reassurance Row */}
            <div className="pt-4 border-t border-[#ECECEC] dark:border-[#1E3048] flex flex-wrap items-center gap-4 text-xs font-semibold text-[#52677D] dark:text-[#9FBBDE]">
              <span className="flex items-center gap-1.5">
                <Lock size={14} className="text-[#1176BC] dark:text-[#25A8E0]" />
                100% Confidential Private Line
              </span>
              <span className="flex items-center gap-1.5">
                <Receipt size={14} className="text-[#1176BC] dark:text-[#25A8E0]" />
                Itemized Handouts &amp; Exams
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#0C9B5E] dark:text-[#22C55E]" />
                Instant Printable PDF Pass
              </span>
            </div>
          </div>

          {/* Right Column: Interactive Realistic Student Portal Preview */}
          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-[#9FBBDE]/60 dark:border-[#1E3048] bg-[#FFFFFF] dark:bg-[#102033] shadow-2xl shadow-[#1176BC]/10 dark:shadow-black/60 overflow-hidden">
              {/* Interactive Device Navigation Bar */}
              <div className="px-5 py-3.5 border-b border-[#ECECEC] dark:border-[#1E3048] bg-[#F8FAFC] dark:bg-[#0A1626] flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-[#10B981] animate-pulse" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#0B1A2B] dark:text-[#FFFFFF]">
                    Live Class Portal Preview
                  </span>
                </div>

                {/* 3 Tab Switchers */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-[#ECECEC] dark:bg-[#172D47]/70 border border-[#C6CACB]/50 dark:border-[#203854]">
                  <button
                    type="button"
                    onClick={() => setActivePreview('card')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activePreview === 'card'
                        ? 'bg-[#1176BC] text-[#FFFFFF] shadow-xs'
                        : 'text-[#2F465E] dark:text-[#CBD5E1] hover:text-[#0B1A2B] dark:hover:text-[#FFFFFF]'
                    }`}
                  >
                    Student Pass
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePreview('private')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activePreview === 'private'
                        ? 'bg-[#1176BC] text-[#FFFFFF] shadow-xs'
                        : 'text-[#2F465E] dark:text-[#CBD5E1] hover:text-[#0B1A2B] dark:hover:text-[#FFFFFF]'
                    }`}
                  >
                    Private Line
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePreview('expenses')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activePreview === 'expenses'
                        ? 'bg-[#1176BC] text-[#FFFFFF] shadow-xs'
                        : 'text-[#2F465E] dark:text-[#CBD5E1] hover:text-[#0B1A2B] dark:hover:text-[#FFFFFF]'
                    }`}
                  >
                    Class Expenses
                  </button>
                </div>
              </div>

              {/* Tab Content Canvas */}
              <div className="p-6 min-h-[350px] flex flex-col justify-between bg-[#FFFFFF] dark:bg-[#102033]">
                {/* 1. STUDENT PASS TAB */}
                {activePreview === 'card' && (
                  <div className="space-y-4">
                    {/* The Metallic Gradient Student Card */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#08385E] via-[#1176BC] to-[#1D93CE] p-5 sm:p-6 text-[#FFFFFF] shadow-lg space-y-4">
                      {/* Top Bar: Chip + Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="size-9 rounded-lg bg-gradient-to-br from-[#FFFFFF] via-[#ECECEC] to-[#C6CACB] p-1 flex items-center justify-center text-[#1176BC] shadow-xs">
                            <Cpu size={18} />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-widest text-[#FFFFFF]/80 font-bold block">
                              Public Health &bull; Batch 6
                            </span>
                            <h3 className="text-base font-bold text-[#FFFFFF]">Ubah Ali Adan (CIS241660)</h3>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FFFFFF] text-[#0C9B5E] text-xs font-extrabold shadow-sm shrink-0">
                          <CheckCircle2 size={13} className="text-[#0C9B5E]" />
                          100% CLEARED
                        </span>
                      </div>

                      {/* 3 Metrics */}
                      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                        <div className="rounded-xl bg-[#FFFFFF]/15 p-2.5">
                          <span className="text-[10px] text-[#FFFFFF]/80 font-semibold block">Paid</span>
                          <span className="text-base font-bold text-[#FFFFFF]">$25.00</span>
                        </div>
                        <div className="rounded-xl bg-[#FFFFFF]/15 p-2.5">
                          <span className="text-[10px] text-[#FFFFFF]/80 font-semibold block">Target</span>
                          <span className="text-base font-bold text-[#FFFFFF]">$25.00</span>
                        </div>
                        <div className="rounded-xl bg-[#FFFFFF]/15 p-2.5">
                          <span className="text-[10px] text-[#FFFFFF]/80 font-semibold block">Remaining</span>
                          <span className="text-base font-bold text-[#FFFFFF]">$0.00</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="h-2 w-full rounded-full bg-[#082B47]/60 overflow-hidden">
                          <div className="h-full w-full rounded-full bg-[#FFFFFF]" />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#FFFFFF]/90 font-medium">
                          <span>Semester Clearance Achieved</span>
                          <span>Verified PostgreSQL Ledger</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#52677D] dark:text-[#CBD5E1] px-1 pt-1">
                      <span className="flex items-center gap-1.5 font-medium">
                        <ShieldCheck size={15} className="text-[#1176BC] dark:text-[#25A8E0]" />
                        Only you see your personal payment history
                      </span>
                      <span className="font-semibold text-[#1176BC] dark:text-[#25A8E0]">
                        Official PDF Pass Ready &rarr;
                      </span>
                    </div>
                  </div>
                )}

                {/* 2. CONFIDENTIAL PRIVATE LINE TAB */}
                {activePreview === 'private' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
                          Confidential Line to Your Class Leader
                        </h3>
                        <p className="text-xs text-[#52677D] dark:text-[#CBD5E1]">
                          Direct 1-on-1 messaging. Never broadcasted on class discussion.
                        </p>
                      </div>
                      <span className="p-1.5 rounded-lg bg-[#1176BC]/10 dark:bg-[#25A8E0]/20 text-[#1176BC] dark:text-[#25A8E0]">
                        <Lock size={15} />
                      </span>
                    </div>

                    {/* Chat Bubble Simulation */}
                    <div className="space-y-2.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#0A1626] border border-[#ECECEC] dark:border-[#1E3048] p-4">
                      {/* Student Message */}
                      <div className="ml-6 rounded-2xl bg-[#1176BC] text-[#FFFFFF] p-3 text-xs leading-relaxed shadow-xs">
                        <span className="text-[10px] font-bold text-[#FFFFFF]/80 block mb-0.5">
                          Student (Private to Class Admin)
                        </span>
                        &ldquo;Salaam brother, I paid my $25 contribution via EVC Plus reference #TX9841. Could you check and clear my pass before Friday?&rdquo;
                      </div>

                      {/* Admin Reply */}
                      <div className="mr-6 rounded-2xl bg-[#FFFFFF] dark:bg-[#102033] border border-[#C6CACB]/70 dark:border-[#203854] p-3 text-xs text-[#0B1A2B] dark:text-[#FFFFFF] leading-relaxed shadow-xs">
                        <span className="text-[10px] font-bold text-[#1176BC] dark:text-[#25A8E0] block mb-0.5">
                          Assigned Class Admin Reply
                        </span>
                        &ldquo;Wa alaykum salaam! Verified and logged just now. Your Semester Clearance Pass is 100% ready to download or print.&rdquo;
                      </div>
                    </div>

                    {/* Action Hub */}
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ECECEC] dark:bg-[#0D1B2C] text-[#0B1A2B] dark:text-[#FFFFFF] border border-[#C6CACB]/70 dark:border-[#203854]">
                        <Phone size={13} className="text-[#1176BC] dark:text-[#25A8E0]" /> Call Class Admin
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ECECEC] dark:bg-[#0D1B2C] text-[#0B1A2B] dark:text-[#FFFFFF] border border-[#C6CACB]/70 dark:border-[#203854]">
                        <MessageSquareText size={13} className="text-[#25A8E0]" /> SMS &bull; WhatsApp
                      </span>
                    </div>
                  </div>
                )}

                {/* 3. CLASS EXPENSES TAB */}
                {activePreview === 'expenses' && (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
                          Itemized Class Spending
                        </h3>
                        <p className="text-xs text-[#52677D] dark:text-[#CBD5E1]">
                          Every handout, booklet, and shared item is recorded with dates.
                        </p>
                      </div>
                      <Receipt size={17} className="text-[#1176BC] dark:text-[#25A8E0]" />
                    </div>

                    <div className="divide-y divide-[#ECECEC] dark:divide-[#1E3048] border border-[#ECECEC] dark:border-[#1E3048] rounded-xl overflow-hidden text-xs">
                      {[
                        {
                          title: 'Course Handouts & Lab Guides Printing',
                          date: 'Receipt #104 • Nov 22',
                          amount: '-$42.00',
                        },
                        {
                          title: 'Midterm Examination Answer Sheets',
                          date: 'Receipt #103 • Nov 18',
                          amount: '-$28.50',
                        },
                        {
                          title: 'Classroom Audio Cable & Whiteboard Supplies',
                          date: 'Receipt #102 • Nov 10',
                          amount: '-$12.00',
                        },
                      ].map((row) => (
                        <div
                          key={row.title}
                          className="p-3 bg-[#FFFFFF] dark:bg-[#0A1626] flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-[#0B1A2B] dark:text-[#FFFFFF] truncate">{row.title}</p>
                            <span className="text-[11px] text-[#52677D] dark:text-[#9FBBDE]">{row.date}</span>
                          </div>
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400 shrink-0">
                            {row.amount}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#52677D] dark:text-[#CBD5E1] pt-1">
                      <span>Net Class Balance: <strong className="text-[#0C9B5E] dark:text-[#22C55E]">$144.50</strong></span>
                      <span className="text-[11px] font-semibold text-[#1176BC] dark:text-[#25A8E0]">Audited in Real-Time</span>
                    </div>
                  </div>
                )}

                {/* Footer anchor */}
                <div className="pt-4 mt-3 border-t border-[#ECECEC] dark:border-[#1E3048] flex items-center justify-between gap-3">
                  <span className="text-xs text-[#52677D] dark:text-[#9FBBDE] font-medium flex items-center gap-1">
                    <Sparkles size={13} className="text-[#25A8E0]" />
                    Ready to check your class balance?
                  </span>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#1176BC] dark:text-[#25A8E0] hover:underline"
                  >
                    Go to Login &rarr;
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
