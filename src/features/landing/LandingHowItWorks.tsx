import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const FAQS = [
  {
    q: 'Can other students see how much I paid or read my messages to the Class Admin?',
    a: 'No. Your personal payment card, contribution timestamps, and any private message you send to your Class Admin remain strictly confidential between you and your assigned class leader.',
  },
  {
    q: 'How do I contact my Class Admin if I sent mobile money or need help?',
    a: 'Inside your Student Dashboard you will see your assigned Class Admin card with direct buttons to Call, send an SMS, message on WhatsApp, or write a 100% confidential in-app Private Message.',
  },
  {
    q: 'Where do class expenses appear?',
    a: 'When your Class Admin purchases handouts, lab booklets, or printing supplies, it is logged with the exact amount and description so every student can inspect the net class balance transparently.',
  },
  {
    q: 'Does ClassBank work like an app on Android and iPhone?',
    a: 'Yes. Tap "Install App" on the navigation bar or inside your dashboard to save ClassBank directly to your phone home screen with instant notifications.',
  },
]

export function LandingHowItWorks() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const steps = [
    {
      num: 'Step 1',
      title: 'Receive Your Student ID',
      desc: 'Your class representative sets up your batch and assigns you a personal Student ID login.',
    },
    {
      num: 'Step 2',
      title: 'Contributions Logged Live',
      desc: 'Whenever you contribute via mobile money or cash, your payment is added to your account immediately.',
    },
    {
      num: 'Step 3',
      title: 'Expenses Stay Open',
      desc: 'Handouts, exam copies, and shared class items are deducted openly against collected totals.',
    },
    {
      num: 'Step 4',
      title: 'Print Clearance Any Time',
      desc: 'Download your payment pass or reach your class leader privately whenever you need support.',
    },
  ]

  return (
    <section id="how-it-works" className="py-16 sm:py-24 bg-[#FFFFFF] dark:bg-[#08121E] border-b border-[#C6CACB]/80 dark:border-[#1D3552]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-20">
        {/* 4-Step Connected Process Track */}
        <div className="space-y-10">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#1176BC] dark:text-[#25A8E0]">
              Semester Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
              Simple from the first payment to final clearance
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-0 md:border-t md:border-[#C6CACB] dark:md:border-[#1D3552] pt-2 md:pt-8">
            {steps.map((s) => (
              <div key={s.num} className="md:pr-8 space-y-2 relative">
                <span className="inline-block text-xs font-mono font-bold text-[#1176BC] dark:text-[#25A8E0] bg-[#ECECEC] dark:bg-[#0E1D31] px-2.5 py-1 rounded-md">
                  {s.num}
                </span>
                <h3 className="text-base font-bold text-[#0B1A2B] dark:text-[#FFFFFF] pt-1">
                  {s.title}
                </h3>
                <p className="text-sm text-[#2F465E] dark:text-[#C6CACB] leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Practical Student FAQ Accordion */}
        <div id="faq" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-4">
          <div className="lg:col-span-4 space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#1176BC] dark:text-[#25A8E0]">
              Frequently Asked
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
              Common Questions
            </h2>
            <p className="text-sm text-[#2F465E] dark:text-[#C6CACB]">
              Answers about privacy, messaging your class representative, and mobile installation.
            </p>
          </div>

          <div className="lg:col-span-8 divide-y divide-[#C6CACB]/80 dark:divide-[#1D3552] border-y border-[#C6CACB]/80 dark:border-[#1D3552]">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx
              return (
                <div key={idx} className="py-4 sm:py-5">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 text-left cursor-pointer"
                  >
                    <span className="text-sm sm:text-base font-bold text-[#0B1A2B] dark:text-[#FFFFFF]">
                      {item.q}
                    </span>
                    <ChevronDown
                      size={18}
                      className={`text-[#1176BC] dark:text-[#25A8E0] shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-2.5 text-sm text-[#2F465E] dark:text-[#C6CACB] leading-relaxed pr-6">
                      {item.a}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
