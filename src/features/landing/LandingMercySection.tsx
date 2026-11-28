import { Link } from 'react-router-dom'
import { HeartHandshake, Quote, ShieldAlert, Users2, ArrowRight, Heart } from 'lucide-react'

export function LandingMercySection() {
  return (
    <section
      id="charity-pledge"
      className="relative py-20 sm:py-24 bg-gradient-to-b from-[#F4F8FC] via-[#FFFFFF] to-[#F4F8FC] dark:from-[#09131F] dark:via-[#0D1B2C] dark:to-[#09131F] border-b border-[#ECECEC] dark:border-[#203854] overflow-hidden"
    >
      {/* Background Ambient Glows matching brand palette */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[580px] bg-[#25A8E0]/8 dark:bg-[#1176BC]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-14">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#9FBBDE] dark:border-[#25A8E0]/40 bg-[#FFFFFF] dark:bg-[#172D47] px-3.5 py-1 text-xs font-bold text-[#1176BC] dark:text-[#25A8E0] shadow-2xs">
            <Heart size={14} className="fill-[#25A8E0] text-[#25A8E0] animate-pulse" />
            <span>The Moral Duty of Brotherhood &amp; Charity</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#0B1A2B] dark:text-[#FFFFFF] tracking-tight">
            The Weight of an Unpaid Share
          </h2>
          <p className="text-base sm:text-lg text-[#2F465E] dark:text-[#DCE8F5] leading-relaxed font-sans">
            In every lecture hall, someone is fighting a silent financial battle. Real success isn&apos;t graduating alone&mdash;it&apos;s lifting your classmates with you.
          </p>
        </div>

        {/* Central Editorial Quote Box */}
        <div className="relative rounded-3xl border border-[#9FBBDE]/70 dark:border-[#25A8E0]/35 bg-[#FFFFFF] dark:bg-[#102033] p-7 sm:p-12 shadow-xl shadow-[#1176BC]/10 dark:shadow-black/40 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1176BC] via-[#25A8E0] to-[#9FBBDE]" />
          <Quote className="absolute top-7 left-6 h-14 w-14 text-[#9FBBDE]/35 dark:text-[#25A8E0]/15 -scale-x-100 pointer-events-none" />

          <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6 pt-2">
            <p className="text-xl sm:text-3xl lg:text-4xl font-serif italic text-[#0B1A2B] dark:text-[#FFFFFF] leading-snug">
              &ldquo;When a classmate sits quietly in the back because they cannot afford their share of the fees, their silence is our collective shame. Real brotherhood isn&rsquo;t graduating alone&mdash;it&rsquo;s ensuring no brother or sister is left behind. Your contribution is not a fee; it is an act of mercy, honor, and dignity.&rdquo;
            </p>

            <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-[#25A8E0] to-transparent mx-auto" />

            <p className="text-base sm:text-xl font-serif text-[#1176BC] dark:text-[#9FBBDE] font-semibold">
              &ldquo;The wealth you withhold today will be forgotten tomorrow. But the burden you lift from a struggling classmate will be remembered by their heart forever.&rdquo;
            </p>

            <div className="pt-1 text-xs uppercase tracking-widest text-[#52677D] dark:text-[#C6CACB] font-bold">
              Class Solidarity &amp; Student Relief Pledge
            </div>
          </div>
        </div>

        {/* The 3 Moral Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: ShieldAlert,
              title: 'The Silent Struggle',
              desc: "Some of our brightest peers silently consider dropping out because they lack $15 or $30 for exam clearance. They will never beg out of self-respect. Our class contribution protects their dignity before it's too late.",
            },
            {
              icon: Users2,
              title: 'Walking Out Together',
              desc: 'A diploma celebrated without the friend who studied beside you every night is an empty victory. We began this academic journey as one unit, and with our collective contributions, we cross the stage together.',
            },
            {
              icon: HeartHandshake,
              title: '100% Audited Mercy',
              desc: 'Every single dollar paid into the fund is tracked in the open ledger. No secret pockets, no missing cents. You can verify with your own eyes that your charity shielded a brother or sister in need.',
            },
          ].map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-2xl border border-[#ECECEC] dark:border-[#203854] bg-[#FFFFFF] dark:bg-[#102033] p-6 space-y-3 hover:border-[#25A8E0] dark:hover:border-[#25A8E0] shadow-xs hover:shadow-md transition-all group"
            >
              <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#1176BC]/12 to-[#25A8E0]/20 dark:from-[#1176BC]/30 dark:to-[#25A8E0]/25 text-[#1176BC] dark:text-[#25A8E0] border border-[#9FBBDE]/40 dark:border-[#25A8E0]/30 group-hover:scale-105 transition-transform">
                <pillar.icon size={23} />
              </div>
              <h3 className="text-lg font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">{pillar.title}</h3>
              <p className="text-sm text-[#2F465E] dark:text-[#C6CACB] leading-relaxed">{pillar.desc}</p>
            </div>
          ))}
        </div>

        {/* Action Callout */}
        <div className="text-center pt-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1176BC] to-[#25A8E0] px-8 py-3.5 text-base font-semibold text-[#FFFFFF] shadow-lg shadow-[#1176BC]/25 hover:opacity-95 active:scale-98 transition-all group"
          >
            <span>Honor Your Class Pledge &amp; Check Status</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="text-xs text-[#52677D] dark:text-[#C6CACB] mt-3 font-medium">
            Open financial audit &middot; Real-time dynamic ledger &middot; Zero student left behind
          </p>
        </div>
      </div>
    </section>
  )
}
