import type { StatItem } from '../../lib/types'
import { Lock, ShieldCheck, Receipt, FileCheck2 } from 'lucide-react'

interface LandingStatsProps {
  stats: StatItem[]
}

const STAT_ICONS = [Lock, ShieldCheck, Receipt, FileCheck2]

export function LandingStats({ stats }: LandingStatsProps) {
  if (!stats || stats.length === 0) return null

  return (
    <section className="border-b border-[#ECECEC] dark:border-[#1E3048] bg-[#FFFFFF] dark:bg-[#08121E]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, idx) => {
            const Icon = STAT_ICONS[idx % STAT_ICONS.length]
            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[#F8FAFC] dark:bg-[#0E1D31] border border-[#ECECEC] dark:border-[#1E3048] flex items-center gap-4 transition-all hover:border-[#1176BC]/40 shadow-xs"
              >
                <div className="size-11 rounded-xl bg-[#1176BC]/10 dark:bg-[#25A8E0]/15 text-[#1176BC] dark:text-[#25A8E0] flex items-center justify-center shrink-0">
                  <Icon size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-sans font-extrabold text-[#0B1A2B] dark:text-[#FFFFFF] tracking-tight leading-none">
                    {stat.value}
                  </p>
                  <p className="text-xs font-semibold text-[#52677D] dark:text-[#9FBBDE] mt-1.5 truncate">
                    {stat.label}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
