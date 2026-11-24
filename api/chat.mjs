const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

function generateLocalFinancialAnalysis(question, ctx = {}) {
  const q = (question || '').toLowerCase()
  const totalContrib = Number(ctx.total_contributions || 0)
  const totalExp = Number(ctx.total_expenses || 0)
  const balance = Number(ctx.remaining_balance !== undefined ? ctx.remaining_balance : (totalContrib - totalExp))
  const target = Number(ctx.contribution_target_per_student || 0)
  const students = Array.isArray(ctx.students) ? ctx.students : []
  const recentContribs = Array.isArray(ctx.recent_contributions) ? ctx.recent_contributions : []
  const recentExpenses = Array.isArray(ctx.recent_expenses) ? ctx.recent_expenses : []

  const totalStudents = students.length
  const paidStudents = students.filter((s) => s.status === 'paid' || (target > 0 && s.total_paid >= target))
  const partialStudents = students.filter((s) => s.status === 'partial' || (s.total_paid > 0 && s.total_paid < target))
  const unpaidStudents = students.filter((s) => !s.total_paid || s.total_paid === 0 || s.status === 'unpaid')

  // 1. Balance / Reserve queries
  if (q.includes('balance') || q.includes('haray') || q.includes('baaqi') || q.includes('remaining') || q.includes('reserve')) {
    return `💰 **Class Bank Net Reserve Balance:** $${balance.toFixed(2)}
• Total Collections: $${totalContrib.toFixed(2)}
• Total Approved Expenses: $${totalExp.toFixed(2)}
• Current Safe In-Bank Balance: $${balance.toFixed(2)}

${balance >= 0 ? '✅ All expense disbursements are fully covered by collections.' : '⚠️ Warning: Expenditures exceed current collections.'}`
  }

  // 2. Unpaid / Who hasn't paid queries
  if (q.includes('unpaid') || q.includes('bixin') || q.includes('hadhay') || q.includes('not paid') || q.includes('pending') || q.includes('deyn')) {
    const list = unpaidStudents.slice(0, 15).map((s) => `• ${s.name} (${s.student_id}) - Paid: $${Number(s.total_paid || 0).toFixed(2)} / Target: $${target.toFixed(2)}`).join('\n')
    return `📋 **Unpaid & Pending Students Report:**
• Total Enrolled: ${totalStudents}
• Fully Cleared: ${paidStudents.length} (${totalStudents > 0 ? Math.round((paidStudents.length / totalStudents) * 100) : 0}%)
• Partial Payments: ${partialStudents.length}
• Unpaid Students: ${unpaidStudents.length}

${unpaidStudents.length > 0 ? `**Students with $0 Paid:**\n${list}${unpaidStudents.length > 15 ? `\n...and ${unpaidStudents.length - 15} more.` : ''}` : '🎉 Fantastic! Every single student has contributed.'}`
  }

  // 3. Expenses / Spending queries
  if (q.includes('expense') || q.includes('kharash') || q.includes('spent') || q.includes('spending') || q.includes('disbursement')) {
    const expList = recentExpenses.slice(0, 10).map((e) => `• ${e.description}: $${Number(e.amount).toFixed(2)} (${new Date(e.date).toLocaleDateString()})`).join('\n')
    return `🧾 **Expense & Spending Audit:**
• Total Disbursed: $${totalExp.toFixed(2)}
• Net Remaining Reserve: $${balance.toFixed(2)}

${recentExpenses.length > 0 ? `**Recent Approved Expenditures:**\n${expList}` : 'No class expenses recorded yet.'}`
  }

  // 4. Top contributors / Most paid
  if (q.includes('top') || q.includes('most') || q.includes('ugu badan') || q.includes('highest')) {
    const sorted = [...students].sort((a, b) => (b.total_paid || 0) - (a.total_paid || 0)).slice(0, 5)
    const list = sorted.map((s, i) => `${i + 1}. ${s.name} (${s.student_id}): $${Number(s.total_paid || 0).toFixed(2)}`).join('\n')
    return `🏆 **Top Class Contributors:**\n${list || 'No contributions recorded yet.'}`
  }

  // 5. Default Comprehensive Financial Executive Summary
  return `📊 **Class Contribution Financial Overview:**
• **Total Contributions:** $${totalContrib.toFixed(2)}
• **Total Class Expenses:** $${totalExp.toFixed(2)}
• **Net Reserve Balance:** $${balance.toFixed(2)}
• **Per-Student Target:** $${target.toFixed(2)}
• **Enrolled Students:** ${totalStudents}
• **Clearance Status:** ${paidStudents.length} Paid | ${partialStudents.length} Partial | ${unpaidStudents.length} Unpaid

You can ask me specific questions like:
- "Who hasn't paid their contributions?"
- "What is our current balance?"
- "What are our recent expenses?"
- "Who are the top contributors?"`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(204).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { question, context } = req.body || {}
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'Missing question parameter' })
  }

  // 1. If OpenRouter API key is configured, query LLM
  if (OPENROUTER_API_KEY) {
    try {
      const prompt = `You are the ClassBank Financial AI Assistant for an educational contribution transparency platform.
Answer the user's financial question based solely on the verified ledger context below.
Be concise, polite, professional, and clear. Format key numbers with currency symbols and use markdown bullet points where appropriate.

FINANCIAL CONTEXT:
${JSON.stringify(context, null, 2)}

USER QUESTION:
${question}
`
      const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://classbank.store',
          'X-Title': 'ClassBank Financial Assistant',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            { role: 'system', content: 'You are an expert school contribution transparency assistant.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 600,
        }),
      })

      if (openRouterRes.ok) {
        const data = await openRouterRes.json()
        const answer = data.choices?.[0]?.message?.content
        if (answer) {
          return res.status(200).json({ answer })
        }
      }
    } catch (err) {
      console.warn('OpenRouter request failed, falling back to local analysis engine:', err.message)
    }
  }

  // 2. Intelligent local financial analysis engine
  const answer = generateLocalFinancialAnalysis(question, context)
  return res.status(200).json({ answer })
}
