import { Target, CreditCard, ReceiptText, FileCheck, Shield, UserCheck, GraduationCap } from 'lucide-react'

export function LandingHowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Class & Contribution Setup',
      desc: 'Class leaders set the semester target for course materials and shared funds. Every student is linked to their official class roster.',
      icon: Target,
    },
    {
      num: '02',
      title: 'Verified Payment Logging',
      desc: 'Class admins log contributions with verifiable timestamps. Personal payment status is derived live—no manual spreadsheet errors.',
      icon: CreditCard,
    },
    {
      num: '03',
      title: 'Itemized Expense Auditing',
      desc: 'Every expenditure (printed booklets, exam clearances, practical tools) is documented with date and description.',
      icon: ReceiptText,
    },
    {
      num: '04',
      title: 'Receipts & Clearance Statements',
      desc: 'Students download official digital receipts; class leaders export auditable PDF statements for university clearance and class meetings.',
      icon: FileCheck,
    },
  ]

  const roles = [
    {
      role: 'Class Administrator',
      badge: 'Course Leadership',
      desc: 'Manages assigned class roster, records student contributions, documents class handout expenses, and answers student inquiries.',
      icon: UserCheck,
    },
    {
      role: 'Student Member',
      badge: 'Self-Service & Privacy',
      desc: 'Logs in with Student ID to check payment balances, downloads official receipts, and reaches out to class leaders confidentially.',
      icon: GraduationCap,
    },
    {
      role: 'Institutional Auditing',
      badge: 'Row-Level Security',
      desc: 'Ensures all financial data is backed by PostgreSQL security policies, preventing unauthorized edits and data tampering.',
      icon: Shield,
    },
  ]

  return (
    <section id="how-it-works" className="py-20 bg-[#F4F8FC] dark:bg-[#0D1B2C] border-b border-[#ECECEC] dark:border-[#203854]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Steps Section */}
        <div>
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
            <p className="text-xs font-bold uppercase tracking-wider text-[#1176BC] dark:text-[#25A8E0]">
              How ClassBank Operates
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
              From Collection to Audit in 4 Clear Steps
            </h2>
            <p className="text-base text-[#2F465E] dark:text-[#DCE8F5]">
              Every transaction follows a clear, auditable workflow so everyone knows where class funds stand at all times.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s) => {
              const Icon = s.icon
              return (
                <div
                  key={s.num}
                  className="rounded-2xl border border-[#ECECEC] dark:border-[#203854] bg-[#FFFFFF] dark:bg-[#102033] p-6 space-y-4 hover:border-[#1176BC] dark:hover:border-[#25A8E0] transition-colors shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#1176BC] dark:text-[#25A8E0] bg-[#9FBBDE]/25 dark:bg-[#172D47] px-2.5 py-1 rounded-lg">
                      {s.num}
                    </span>
                    <Icon size={18} className="text-[#52677D] dark:text-[#9FBBDE]" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">{s.title}</h3>
                    <p className="text-xs sm:text-sm text-[#2F465E] dark:text-[#C6CACB] leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Roles Section */}
        <div>
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-[#1176BC] dark:text-[#25A8E0]">
              Accountability Across Roles
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
              Clear Permissions for Everyone
            </h2>
            <p className="text-sm text-[#2F465E] dark:text-[#DCE8F5]">
              Strict Supabase Row-Level Security guarantees students only see what belongs to them and administrators only manage their assigned classes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roles.map((r) => {
              const Icon = r.icon
              return (
                <div
                  key={r.role}
                  className="rounded-2xl border border-[#ECECEC] dark:border-[#203854] bg-[#FFFFFF] dark:bg-[#102033] p-6 space-y-3.5 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-[#1176BC]/10 dark:bg-[#1176BC]/25 text-[#1176BC] dark:text-[#25A8E0] flex items-center justify-center font-bold">
                      <Icon size={19} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">{r.role}</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1176BC] dark:text-[#25A8E0]">
                        {r.badge}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-[#2F465E] dark:text-[#C6CACB] leading-relaxed">
                    {r.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
