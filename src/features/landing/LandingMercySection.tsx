import { Shield, Receipt, Scale } from 'lucide-react'

export function LandingMercySection() {
  const commitments = [
    {
      icon: Shield,
      title: 'Dignity Over Public Pressure',
      body: 'Financial circumstances are personal. If a classmate needs a week to catch up or pays in installments via mobile money, they speak privately 1-on-1 with their class leader—never exposed in front of the whole batch.',
    },
    {
      icon: Receipt,
      title: 'Every Dollar Openly Accounted For',
      body: 'Class contributions pay for real academic necessities: printed lecture guides, exam answer booklets, and lab supplies. Every expense is logged with dates and receipts so classmates always know where funds go.',
    },
    {
      icon: Scale,
      title: 'One Fair Standard for Every Classmate',
      body: 'Balances and semester clearance statuses are derived directly from verified payment records rather than copied manually across confusing notebooks or spreadsheets.',
    },
  ]

  return (
    <section
      id="community-pledge"
      className="py-16 sm:py-24 bg-[#F8FAFC] dark:bg-[#0B1728] border-b border-[#ECECEC] dark:border-[#1E3048]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Left Column */}
          <div className="lg:col-span-5 space-y-5">
            <span className="text-xs font-bold uppercase tracking-widest text-[#1176BC] dark:text-[#25A8E0]">
              Our Shared Class Principle
            </span>
            <h2 className="text-3xl sm:text-4xl font-sans font-extrabold text-[#0B1A2B] dark:text-[#FFFFFF] leading-tight tracking-tight">
              Moving past WhatsApp chaos &amp; lost paper notebooks.
            </h2>
            <p className="text-sm sm:text-base text-[#2F465E] dark:text-[#CBD5E1] leading-relaxed">
              Managing class contributions shouldn&apos;t create tension between classmates or hours of manual tracking for class representatives. When records are clear, everyone stays focused on studying and graduating together.
            </p>

            <blockquote className="border-l-4 border-[#1176BC] dark:border-[#25A8E0] pl-5 py-2 space-y-1.5 bg-[#FFFFFF]/70 dark:bg-[#102033]/60 rounded-r-xl">
              <p className="text-sm sm:text-base font-medium italic text-[#0B1A2B] dark:text-[#FFFFFF] leading-relaxed">
                &ldquo;Real class leadership protects every student&apos;s dignity while keeping every single penny transparent to the class.&rdquo;
              </p>
              <footer className="text-xs font-bold text-[#1176BC] dark:text-[#25A8E0]">
                ZUST &amp; Baidoa University Class Standard
              </footer>
            </blockquote>
          </div>

          {/* Right Column: 3 Clean Cards */}
          <div className="lg:col-span-7 space-y-4">
            {commitments.map((item, idx) => {
              const Icon = item.icon
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-[#FFFFFF] dark:bg-[#102033] border border-[#ECECEC] dark:border-[#1E3048] shadow-xs flex items-start gap-4 transition-all hover:border-[#1176BC]/40"
                >
                  <div className="size-11 rounded-xl bg-[#1176BC]/10 dark:bg-[#25A8E0]/15 text-[#1176BC] dark:text-[#25A8E0] flex items-center justify-center shrink-0">
                    <Icon size={22} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#2F465E] dark:text-[#CBD5E1] leading-relaxed">
                      {item.body}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
