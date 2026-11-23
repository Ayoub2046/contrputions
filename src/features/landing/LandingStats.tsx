import type { StatItem } from '../../lib/types'

interface LandingStatsProps {
  stats: StatItem[]
}

export function LandingStats({ stats }: LandingStatsProps) {
  if (!stats || stats.length === 0) return null

  return (
    <section className="relative border-b border-border bg-bg-card/60 backdrop-blur-sm py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center divide-y lg:divide-y-0 lg:divide-x divide-border">
          {stats.map((stat, idx) => (
            <div key={idx} className={`${idx > 0 ? 'pt-4 lg:pt-0' : ''} px-4 space-y-1`}>
              <p className="text-3xl sm:text-4xl font-serif font-bold text-brand-600 dark:text-brand-900 tracking-tight">
                {stat.value}
              </p>
              <p className="text-xs sm:text-sm font-medium text-secondary">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
