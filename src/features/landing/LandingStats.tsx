import type { StatItem } from '../../lib/types'

interface LandingStatsProps {
  stats: StatItem[]
}

export function LandingStats({ stats }: LandingStatsProps) {
  if (!stats || stats.length === 0) return null

  return (
    <section className="border-b border-[#C6CACB]/80 dark:border-[#1D3552] bg-[#ECECEC]/40 dark:bg-[#0E1D31]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-[#C6CACB]/70 dark:divide-[#1D3552]">
          {stats.map((stat, idx) => (
            <div key={idx} className="py-7 sm:py-9 px-4 sm:px-6 text-left">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#1176BC] dark:text-[#25A8E0] tracking-tight">
                {stat.value}
              </p>
              <p className="text-xs sm:text-sm font-medium text-[#2F465E] dark:text-[#DCE8F5] mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
