import { ShieldCheck, Heart, Users2, Award } from 'lucide-react'

export function LandingMercySection() {
  return (
    <section
      id="community-pledge"
      className="relative py-20 sm:py-24 bg-gradient-to-b from-[#F4F8FC] via-[#FFFFFF] to-[#F4F8FC] dark:from-[#09131F] dark:via-[#0D1B2C] dark:to-[#09131F] border-b border-[#ECECEC] dark:border-[#203854] overflow-hidden"
    >
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#9FBBDE] dark:border-[#25A8E0]/40 bg-[#FFFFFF] dark:bg-[#172D47] px-3.5 py-1 text-xs font-bold text-[#1176BC] dark:text-[#25A8E0] shadow-2xs">
            <Heart size={14} className="fill-[#25A8E0] text-[#25A8E0]" />
            <span>Community &amp; Educational Solidarity</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#0B1A2B] dark:text-[#FFFFFF] tracking-tight">
            Built on Trust, Fairness &amp; Academic Brotherhood
          </h2>
          <p className="text-base sm:text-lg text-[#2F465E] dark:text-[#DCE8F5] leading-relaxed font-sans">
            In our university classrooms, financial clarity isn&apos;t just about math—it&apos;s about respect, dignity, and ensuring no student faces academic barriers alone.
          </p>
        </div>

        {/* Central Thoughtful Quote Card */}
        <div className="relative rounded-3xl border border-[#9FBBDE]/70 dark:border-[#25A8E0]/35 bg-[#FFFFFF] dark:bg-[#102033] p-7 sm:p-10 shadow-xl shadow-[#1176BC]/10 dark:shadow-black/40 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1176BC] via-[#25A8E0] to-[#9FBBDE]" />

          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-5 pt-2">
            <p className="text-lg sm:text-2xl font-serif italic text-[#0B1A2B] dark:text-[#FFFFFF] leading-relaxed">
              &ldquo;When a class fund is managed with complete transparency, every student knows they are respected and treated fairly. No student should face academic exclusion or uncertainty over their contributions. Real class leadership is about lifting everyone toward graduation together.&rdquo;
            </p>

            <div className="h-0.5 w-20 bg-gradient-to-r from-transparent via-[#25A8E0] to-transparent mx-auto" />

            <div className="text-xs uppercase tracking-widest text-[#52677D] dark:text-[#C6CACB] font-bold">
              Class Mutual Trust &amp; Transparency Standard
            </div>
          </div>
        </div>

        {/* 3 Authentic Community Principles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-[#ECECEC] dark:border-[#203854] bg-[#FFFFFF] dark:bg-[#102033] p-6 space-y-3 shadow-xs">
            <div className="size-10 rounded-xl bg-[#1176BC]/10 dark:bg-[#1176BC]/20 text-[#1176BC] dark:text-[#25A8E0] flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-base font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
              Respect for Student Dignity
            </h3>
            <p className="text-xs sm:text-sm text-[#2F465E] dark:text-[#C6CACB] leading-relaxed">
              Personal financial circumstances and private inquiries are kept strictly confidential between the student and their class leader. No public embarrassment.
            </p>
          </div>

          <div className="rounded-2xl border border-[#ECECEC] dark:border-[#203854] bg-[#FFFFFF] dark:bg-[#102033] p-6 space-y-3 shadow-xs">
            <div className="size-10 rounded-xl bg-[#25A8E0]/10 dark:bg-[#25A8E0]/20 text-[#25A8E0] flex items-center justify-center">
              <Award size={20} />
            </div>
            <h3 className="text-base font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
              Itemized Accountability
            </h3>
            <p className="text-xs sm:text-sm text-[#2F465E] dark:text-[#C6CACB] leading-relaxed">
              Every expense—printed exam forms, handout booklets, or practical materials—is documented with date, exact cost, and verifiable description.
            </p>
          </div>

          <div className="rounded-2xl border border-[#ECECEC] dark:border-[#203854] bg-[#FFFFFF] dark:bg-[#102033] p-6 space-y-3 shadow-xs">
            <div className="size-10 rounded-xl bg-[#0C9B5E]/10 dark:bg-[#0C9B5E]/20 text-[#0C9B5E] dark:text-[#22C55E] flex items-center justify-center">
              <Users2 size={20} />
            </div>
            <h3 className="text-base font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
              Shared Graduation Goal
            </h3>
            <p className="text-xs sm:text-sm text-[#2F465E] dark:text-[#C6CACB] leading-relaxed">
              Ensuring that course requirements and class contributions support the academic journey of every single peer so everyone walks across the stage together.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
