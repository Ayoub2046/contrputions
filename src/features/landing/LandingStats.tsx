import type { StatItem } from '../../lib/types'

interface LandingStatsProps {
  stats: StatItem[]
}

export function LandingStats({ stats }: LandingStatsProps) {
  if (!stats || stats.length === 0) return null

  return (
    <section className="relative border-b border-[#ECECEC] dark:border-[#203854] bg-[#FFFFFF] dark:bg-[#102033] py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center divide-y sm:divide-y-0 lg:divide-x divide-[#ECECEC] dark:divide-[#203854]">
          {stats.map((stat, idx) => (
            <div key={idx} className={`${idx > 0 ? 'pt-4 sm:pt-0' : ''} px-4 space-y-1.5`}>
              <p className="text-3xl sm:text-4xl font-serif font-bold text-[#1176BC] dark:text-[#25A8E0] tracking-tight">
                {stat.value}
              </p>
              <p className="text-xs sm:text-sm font-semibold text-[#2F465E] dark:text-[#DCE8F5]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
