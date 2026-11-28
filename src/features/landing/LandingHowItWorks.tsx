import { Target, CreditCard, ReceiptText, FileCheck, Shield, UserCheck, GraduationCap } from 'lucide-react'

export function LandingHowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Target & Class Setup',
      desc: 'Administrators define each class semester target. Every student record is linked directly to their class without manual spreadsheet juggling.',
      icon: Target,
    },
    {
      num: '02',
      title: 'Instant Contribution Logging',
      desc: 'Class treasurers log student contributions. The system dynamically derives status (Paid, Partial, Unpaid) directly from verified raw rows.',
      icon: CreditCard,
    },
    {
      num: '03',
      title: 'Real-Time Expense Receipts',
      desc: 'Every expenditure (events, equipment, handouts) is recorded with date, description, and admin signature. Remaining funds update live.',
      icon: ReceiptText,
    },
    {
      num: '04',
      title: 'Instant PDF Statements',
      desc: 'Export formal, unalterable financial statements at any moment for class meetings, student body reviews, and administrative audits.',
      icon: FileCheck,
    },
  ]

  const roles = [
    {
      role: 'Super Admin',
      badge: 'Full Governance',
      desc: 'Oversees all university classes, creates treasurers, audits all transactions across the entire institution.',
      icon: Shield,
    },
    {
      role: 'Class Admin / Treasurer',
      badge: 'Class Level Scope',
      desc: 'Manages assigned class only, records student payments, logs expenditures, and generates PDF financial reports.',
      icon: UserCheck,
    },
    {
      role: 'Student Member',
      badge: 'Total Transparency',
      desc: 'Views their personal payment history, tracks the live class treasury, and contacts class admins directly.',
      icon: GraduationCap,
    },
  ]

  return (
    <section id="how-it-works" className="py-20 bg-[#F4F8FC] dark:bg-[#0D1B2C] border-b border-[#ECECEC] dark:border-[#203854]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Steps Section */}
        <div>
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
            <p className="text-xs font-bold uppercase tracking-wider text-[#1176BC] dark:text-[#25A8E0]">
              Simple 4-Step Process
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
              How ClassBank Delivers Full Transparency
            </h2>
            <p className="text-base text-[#2F465E] dark:text-[#DCE8F5]">
              From the first payment to semester closeout, every transaction is audited and visible.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, idx) => {
              const Icon = step.icon
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-[#ECECEC] dark:border-[#203854] bg-[#FFFFFF] dark:bg-[#102033] p-6 space-y-3.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-serif font-bold text-[#9FBBDE] dark:text-[#9FBBDE]/80">
                      {step.num}
                    </span>
                    <div className="size-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#1176BC]/10 to-[#25A8E0]/20 dark:bg-[#172D47] border border-[#9FBBDE]/40 dark:border-[#25A8E0]/30 text-[#1176BC] dark:text-[#25A8E0]">
                      <Icon size={20} />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">{step.title}</h3>
                  <p className="text-sm text-[#2F465E] dark:text-[#C6CACB] leading-relaxed">{step.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Role Isolation Section */}
        <div id="transparency" className="pt-12 border-t border-[#C6CACB]/60 dark:border-[#203854]">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-[#1176BC] dark:text-[#25A8E0]">
              Security Architecture
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
              Strict Role-Based Data Isolation
            </h2>
            <p className="text-base text-[#2F465E] dark:text-[#DCE8F5]">
              Permissions are enforced directly at the database engine level via Supabase Row-Level Security (RLS).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roles.map((r, i) => {
              const Icon = r.icon
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-[#ECECEC] dark:border-[#203854] bg-[#FFFFFF] dark:bg-[#102033] p-6 space-y-4 hover:border-[#25A8E0] dark:hover:border-[#25A8E0] shadow-xs transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1176BC] to-[#25A8E0] text-[#FFFFFF] shadow-sm">
                      <Icon size={21} />
                    </div>
                    <span className="rounded-full bg-[#9FBBDE]/25 dark:bg-[#172D47] border border-[#9FBBDE]/50 dark:border-[#25A8E0]/30 px-3 py-1 text-xs font-bold text-[#1176BC] dark:text-[#9FBBDE]">
                      {r.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">{r.role}</h3>
                  <p className="text-sm text-[#2F465E] dark:text-[#C6CACB] leading-relaxed">{r.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
