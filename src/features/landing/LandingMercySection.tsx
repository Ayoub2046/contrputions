export function LandingMercySection() {
  const commitments = [
    {
      num: 'I',
      title: 'Dignity Over Public Pressure',
      body: 'Financial circumstances are personal. If a classmate needs a week to catch up or wants to ask about mobile money payment, they speak privately 1-on-1 with their class leader—never in front of the whole batch.',
    },
    {
      num: 'II',
      title: 'Every Dollar Accounted For',
      body: 'Class funds pay for real academic needs: printed study booklets, exam papers, and lab supplies. Every expense item is recorded openly so classmates never wonder where pooled money went.',
    },
    {
      num: 'III',
      title: 'One Standard for Every Classmate',
      body: 'Balances and clearance percentages are calculated directly from verified transactions rather than copied manually between notebooks or spreadsheets.',
    },
  ]

  return (
    <section
      id="community-pledge"
      className="py-16 sm:py-24 bg-[#FFFFFF] dark:bg-[#08121E] border-b border-[#C6CACB]/80 dark:border-[#1D3552]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Left Editorial Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#1176BC] dark:text-[#25A8E0]">
                Why Our Class Uses This
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0B1A2B] dark:text-[#FFFFFF] leading-tight">
                Moving past WhatsApp chaos and paper notebooks.
              </h2>
            </div>

            <p className="text-sm sm:text-base text-[#2F465E] dark:text-[#DCE8F5] leading-relaxed">
              Managing class contributions shouldn&apos;t create misunderstandings between classmates or hours of manual tracking for class representatives. When records are clear, everyone stays focused on studying and graduating together.
            </p>

            {/* Quiet Editorial Quote with Left Bar */}
            <blockquote className="border-l-4 border-[#1176BC] dark:border-[#25A8E0] pl-5 py-1 space-y-2">
              <p className="text-base sm:text-lg font-serif italic text-[#0B1A2B] dark:text-[#FFFFFF] leading-relaxed">
                &ldquo;Real class leadership protects every student&apos;s dignity while keeping every single penny transparent to the class.&rdquo;
              </p>
              <footer className="text-xs font-semibold text-[#52677D] dark:text-[#9FBBDE]">
                ZUST &amp; Baidoa Student Contribution Principle
              </footer>
            </blockquote>
          </div>

          {/* Right Column: Clean Hairline List */}
          <div className="lg:col-span-7 divide-y divide-[#C6CACB]/80 dark:divide-[#1D3552] border-y border-[#C6CACB]/80 dark:border-[#1D3552]">
            {commitments.map((item) => (
              <div key={item.num} className="py-6 sm:py-7 flex items-start gap-5">
                <span className="font-serif text-xl sm:text-2xl font-bold text-[#1176BC] dark:text-[#25A8E0] w-7 shrink-0">
                  {item.num}.
                </span>
                <div className="space-y-1.5">
                  <h3 className="text-base sm:text-lg font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#2F465E] dark:text-[#C6CACB] leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
