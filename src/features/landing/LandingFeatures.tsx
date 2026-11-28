import {
  ShieldCheck,
  Calculator,
  Users,
  FileSpreadsheet,
  Receipt,
  PhoneCall,
  Lock,
  CheckCircle,
  MessageSquareText,
  FileCheck,
} from 'lucide-react'
import type { FeatureItem } from '../../lib/types'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  ShieldCheck,
  Calculator,
  Users,
  FileSpreadsheet,
  Receipt,
  PhoneCall,
  Lock,
  CheckCircle,
  MessageSquareText,
  FileCheck,
}

interface LandingFeaturesProps {
  features?: FeatureItem[]
}

export function LandingFeatures({ features }: LandingFeaturesProps) {
  const displayFeatures =
    features && features.length > 0
      ? features
      : [
          {
            title: 'Personal Contribution Record',
            desc: 'Log in with your Student ID to check weekly and monthly contributions, remaining balances, and verified timestamps.',
            icon: 'ShieldCheck',
          },
          {
            title: 'Itemized Class Expenses',
            desc: 'Complete accounting of class printing, study handouts, practical materials, and events. Every dollar is documented.',
            icon: 'Calculator',
          },
          {
            title: 'Official Clearance Passes',
            desc: 'Instant digital payment receipts that can be printed or saved as PDF for university administrative peace of mind.',
            icon: 'FileSpreadsheet',
          },
          {
            title: 'Private Leadership Line',
            desc: 'Reach your assigned class administrator directly via phone, SMS, WhatsApp, or confidential 1-on-1 private messaging.',
            icon: 'Users',
          },
        ]

  return (
    <section id="features" className="py-16 sm:py-24 bg-[#ECECEC]/40 dark:bg-[#0E1D31] border-b border-[#C6CACB]/80 dark:border-[#1D3552]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="max-w-2xl space-y-2.5">
          <span className="text-xs font-bold uppercase tracking-widest text-[#1176BC] dark:text-[#25A8E0]">
            What Each Portal Includes
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
            Practical tools built for daily class life
          </h2>
          <p className="text-sm sm:text-base text-[#2F465E] dark:text-[#DCE8F5]">
            Everything students and class leaders need during a semester, organized cleanly without clutter.
          </p>
        </div>

        {/* Unified 2x2 Architectural Hairline Frame (instead of disconnected floating cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 rounded-2xl border border-[#C6CACB] dark:border-[#1D3552] bg-[#FFFFFF] dark:bg-[#08121E] overflow-hidden divide-y md:divide-y-0">
          {displayFeatures.map((feat, idx) => {
            const Icon = (feat.icon && ICON_MAP[feat.icon]) || CheckCircle
            const isRightCol = idx % 2 === 1
            const isSecondRow = idx >= 2

            return (
              <div
                key={idx}
                className={`p-7 sm:p-9 space-y-3.5 transition-colors hover:bg-[#ECECEC]/35 dark:hover:bg-[#0E1D31]/70 ${
                  isRightCol ? 'md:border-l md:border-[#C6CACB]/80 dark:md:border-[#1D3552]' : ''
                } ${isSecondRow ? 'md:border-t md:border-[#C6CACB]/80 dark:md:border-[#1D3552]' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="size-10 rounded-lg bg-[#1176BC]/10 dark:bg-[#1176BC]/25 text-[#1176BC] dark:text-[#25A8E0] flex items-center justify-center">
                    <Icon size={20} />
                  </div>
                  <span className="font-mono text-xs font-semibold text-[#52677D] dark:text-[#9FBBDE]">
                    0{idx + 1}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
                  {feat.title}
                </h3>
                <p className="text-sm text-[#2F465E] dark:text-[#C6CACB] leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
