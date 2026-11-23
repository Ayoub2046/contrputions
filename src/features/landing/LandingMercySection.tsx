import { Link } from 'react-router-dom'
import { HeartHandshake, Quote, ShieldAlert, Users2, ArrowRight, Heart } from 'lucide-react'

export function LandingMercySection() {
  return (
    <section id="charity-pledge" className="relative py-24 bg-gradient-to-b from-bg-card via-bg-main to-bg-card border-b border-border overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Heart size={14} className="fill-amber-500 text-amber-500 animate-pulse" />
            <span>The Moral Duty of Brotherhood & Charity</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-text tracking-tight">
            The Weight of an Unpaid Share
          </h2>
          <p className="text-base sm:text-lg text-secondary leading-relaxed font-sans">
            In every lecture hall, someone is fighting a silent financial battle. Real success isn't graduating alone—it's lifting your classmates with you.
          </p>
        </div>

        {/* Central Hard-Hitting Quote Box */}
        <div className="relative rounded-2xl border-2 border-brand-600/30 bg-gradient-to-br from-bg-card/95 via-brand-50/40 to-bg-card/95 dark:from-slate-900/90 dark:via-brand-900/20 dark:to-slate-900/90 p-8 sm:p-12 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:shadow-brand-600/10">
          <Quote className="absolute top-6 left-6 h-16 w-16 text-brand-600/15 -scale-x-100 pointer-events-none" />
          
          <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-serif italic text-text leading-snug">
              &ldquo;When a classmate sits quietly in the back because they cannot afford their share of the fees, their silence is our collective shame. Real brotherhood isn’t graduating alone—it’s ensuring no brother or sister is left behind. Your contribution is not a fee; it is an act of mercy, honor, and dignity.&rdquo;
            </p>

            <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-brand-600 to-transparent mx-auto" />

            <p className="text-lg sm:text-xl font-serif text-brand-600 dark:text-brand-900 font-semibold">
              &ldquo;The wealth you withhold today will be forgotten tomorrow. But the burden you lift from a struggling classmate will be remembered by their heart forever.&rdquo;
            </p>

            <div className="pt-2 text-xs uppercase tracking-widest text-muted font-bold">
              Class Solidarity & Student Relief Pledge
            </div>
          </div>
        </div>

        {/* The 3 Moral Truth Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-card border border-border bg-bg-card p-6 space-y-3 hover:border-amber-500/40 transition-colors group">
            <div className="flex h-12 w-12 items-center justify-center rounded-btn bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
              <ShieldAlert size={24} />
            </div>
            <h3 className="text-lg font-bold text-text">The Silent Struggle</h3>
            <p className="text-sm text-secondary leading-relaxed">
              Some of our brightest peers silently consider dropping out because they lack $15 or $30 for exam clearance. They will never beg out of self-respect. Our class contribution protects their dignity before it's too late.
            </p>
          </div>

          <div className="rounded-card border border-border bg-bg-card p-6 space-y-3 hover:border-brand-600/40 transition-colors group">
            <div className="flex h-12 w-12 items-center justify-center rounded-btn bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-900 group-hover:scale-110 transition-transform">
              <Users2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-text">Walking Out Together</h3>
            <p className="text-sm text-secondary leading-relaxed">
              A diploma celebrated without the friend who studied beside you every night is an empty victory. We began this academic journey as one unit, and with our collective contributions, we cross the stage together.
            </p>
          </div>

          <div className="rounded-card border border-border bg-bg-card p-6 space-y-3 hover:border-success/40 transition-colors group">
            <div className="flex h-12 w-12 items-center justify-center rounded-btn bg-success/10 text-success group-hover:scale-110 transition-transform">
              <HeartHandshake size={24} />
            </div>
            <h3 className="text-lg font-bold text-text">100% Audited Mercy</h3>
            <p className="text-sm text-secondary leading-relaxed">
              Every single dollar paid into ClassBank is tracked in the open ledger. No secret pockets, no missing cents. You can verify with your own eyes that your charity shielded a brother or sister in need.
            </p>
          </div>
        </div>

        {/* Action Callout */}
        <div className="text-center pt-4">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-btn bg-brand-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg hover:bg-brand-600/90 active:scale-98 transition-all group"
          >
            <span>Honor Your Class Pledge & Check Status</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="text-xs text-muted mt-3">
            Open financial audit &middot; Real-time dynamic ledger &middot; Zero student left behind
          </p>
        </div>
      </div>
    </section>
  )
}
