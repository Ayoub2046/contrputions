import {
  ShieldCheck,
  Calculator,
  Users,
  FileSpreadsheet,
  Wallet,
  Lock,
  PieChart,
  Receipt,
  Scale,
  Sparkles,
  CheckCircle,
} from 'lucide-react'
import type { FeatureItem } from '../../lib/types'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  ShieldCheck,
  Calculator,
  Users,
  FileSpreadsheet,
  Wallet,
  Lock,
  PieChart,
  Receipt,
  Scale,
  Sparkles,
  CheckCircle,
}

interface LandingFeaturesProps {
  features: FeatureItem[]
}

export function LandingFeatures({ features }: LandingFeaturesProps) {
  return (
    <section id="features" className="py-20 bg-[#FFFFFF] dark:bg-[#09131F] border-b border-[#ECECEC] dark:border-[#203854]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
          <p className="text-xs font-bold uppercase tracking-wider text-[#1176BC] dark:text-[#25A8E0]">
            Engineered For Absolute Integrity
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
            Every dollar accounted for. In real time.
          </h2>
          <p className="text-base text-[#2F465E] dark:text-[#DCE8F5]">
            Built upon PostgreSQL and Row Level Security, ClassBank eliminates financial ambiguity,
            providing students, treasurers, and university heads with instant, verifiable ledgers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((item, index) => {
            const IconComponent = ICON_MAP[item.icon] || ShieldCheck
            return (
              <div
                key={index}
                className="group relative rounded-2xl border border-[#ECECEC] dark:border-[#203854] bg-[#F4F8FC]/60 dark:bg-[#102033] p-6 shadow-xs hover:shadow-md hover:border-[#25A8E0] dark:hover:border-[#25A8E0] transition-all duration-200 flex flex-col justify-between overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1176BC] to-[#25A8E0] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="space-y-4">
                  <div className="inline-flex size-12 items-center justify-center rounded-xl bg-[#FFFFFF] dark:bg-[#172D47] border border-[#9FBBDE]/50 dark:border-[#25A8E0]/30 text-[#1176BC] dark:text-[#25A8E0] shadow-2xs group-hover:scale-105 transition-transform">
                    <IconComponent size={23} />
                  </div>
                  <h3 className="text-lg font-bold text-[#0B1A2B] dark:text-[#FFFFFF] font-sans">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#2F465E] dark:text-[#C6CACB] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#ECECEC] dark:border-[#203854] flex items-center justify-between text-xs font-bold text-[#1176BC] dark:text-[#9FBBDE]">
                  <span>Transparent by default</span>
                  <span className="size-1.5 rounded-full bg-[#25A8E0]" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
