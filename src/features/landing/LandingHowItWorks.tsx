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
      desc: 'Views their personal payment history, tracks the live class treasury, and monitors class expenses with zero ambiguity.',
      icon: GraduationCap,
    },
  ]

  return (
    <section id="how-it-works" className="py-20 bg-bg-card border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Steps Section */}
        <div>
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-900">
              Simple 4-Step Process
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-text">
              How ClassBank Delivers Full Transparency
            </h2>
            <p className="text-base text-secondary">
              From the first payment to semester closeout, every transaction is audited and visible.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, idx) => {
              const Icon = step.icon
              return (
                <div key={idx} className="relative space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-serif font-bold text-brand-600/30 dark:text-brand-900/40">
                      {step.num}
                    </span>
                    <div className="h-10 w-10 flex items-center justify-center rounded-btn bg-bg-elevated border border-border text-brand-600">
                      <Icon size={20} />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-text">{step.title}</h3>
                  <p className="text-sm text-secondary leading-relaxed">{step.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Role Isolation Section */}
        <div id="transparency" className="pt-8 border-t border-border">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-900">
              Security Architecture
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-text">
              Strict Role-Based Data Isolation
            </h2>
            <p className="text-base text-secondary">
              Permissions are enforced directly at the database engine level via Supabase Row-Level Security (RLS).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roles.map((r, i) => {
              const Icon = r.icon
              return (
                <div
                  key={i}
                  className="rounded-card border border-border bg-bg-main p-6 space-y-4 hover:border-border-hover transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-btn bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-900">
                      <Icon size={22} />
                    </div>
                    <span className="rounded-full bg-brand-600/10 px-2.5 py-1 text-xs font-semibold text-brand-600 dark:text-brand-900">
                      {r.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-text">{r.role}</h3>
                  <p className="text-sm text-secondary leading-relaxed">{r.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
