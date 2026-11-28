import {
  ShieldCheck,
  Calculator,
  Users,
  FileSpreadsheet,
  Receipt,
  PhoneCall,
  Lock,
  CheckCircle,
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
            title: 'Student Self-Service & Privacy',
            desc: 'Log in with your Student ID to check your payments, remaining balance, and verified timestamps without public exposure.',
            icon: 'ShieldCheck',
          },
          {
            title: 'Itemized Course Expenses',
            desc: 'Transparent accounting of class printing, study handouts, practical materials, and events. Every dollar is documented.',
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
    <section id="features" className="py-20 bg-[#FFFFFF] dark:bg-[#09131F] border-b border-[#ECECEC] dark:border-[#203854]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
          <p className="text-xs font-bold uppercase tracking-wider text-[#1176BC] dark:text-[#25A8E0]">
            Core Platform Capabilities
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
            Designed for Real University Classrooms
          </h2>
          <p className="text-base text-[#2F465E] dark:text-[#DCE8F5]">
            Replacing disorganized group chats and paper notebooks with an audited, bank-grade ledger that protects student dignity and ensures total accountability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayFeatures.map((feat, idx) => {
            const Icon = (feat.icon && ICON_MAP[feat.icon]) || CheckCircle

            return (
              <div
                key={idx}
                className="group relative rounded-2xl border border-[#ECECEC] dark:border-[#203854] bg-[#F4F8FC] dark:bg-[#102033] p-6 space-y-4 hover:border-[#1176BC] dark:hover:border-[#25A8E0] hover:shadow-lg transition-all"
              >
                <div className="size-11 rounded-xl bg-[#FFFFFF] dark:bg-[#172D47] border border-[#ECECEC] dark:border-[#203854] flex items-center justify-center text-[#1176BC] dark:text-[#25A8E0] shadow-2xs group-hover:scale-105 transition-transform">
                  <Icon size={20} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
                    {feat.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#2F465E] dark:text-[#C6CACB] leading-relaxed">
                    {feat.desc}
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
