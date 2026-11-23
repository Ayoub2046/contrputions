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
    <section id="features" className="py-20 bg-bg-main border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-900">
            Engineered For Absolute Integrity
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-text">
            Every dollar accounted for. In real time.
          </h2>
          <p className="text-base text-secondary">
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
                className="group relative rounded-card border border-border bg-bg-card p-6 shadow-sm hover:shadow-md hover:border-brand-600/40 transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-btn bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-900 group-hover:scale-110 transition-transform">
                    <IconComponent size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-text font-sans">
                    {item.title}
                  </h3>
                  <p className="text-sm text-secondary leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/60 flex items-center text-xs font-semibold text-brand-600 dark:text-brand-900">
                  <span>Transparent by default</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
