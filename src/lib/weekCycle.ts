/**
 * Saturday-to-Friday Weekly Contribution Cycle Utilities
 *
 * In this system, academic contribution cycles run from Saturday (Day 1)
 * to Friday (Day 7, Final Cutoff Day).
 */

export interface WeekCycle {
  id: string // e.g. "cycle_2026-11-21"
  startDate: Date
  endDate: Date
  startDateStr: string // "YYYY-MM-DD"
  endDateStr: string // "YYYY-MM-DD"
  label: string // "Sat Nov 21 - Fri Nov 27, 2026"
  shortLabel: string // "Nov 21 - Nov 27"
  isCurrent: boolean
  dayIndex: number // 1 (Saturday) to 7 (Friday)
  dayName: string
  daysRemaining: number // 6 down to 0 on Friday
  isFriday: boolean
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/**
 * Given a reference date, returns the Saturday-to-Friday cycle containing that date.
 */
export function getWeekCycleForDate(dateInput: Date | string = new Date(), forceCurrent?: boolean): WeekCycle {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput)
  const now = new Date()

  // diffToSaturday: Saturday is 0, Sunday is 1, ..., Friday is 6
  const day = d.getDay()
  const diffToSaturday = (day + 1) % 7

  const sat = new Date(d)
  sat.setDate(d.getDate() - diffToSaturday)
  sat.setHours(0, 0, 0, 0)

  const fri = new Date(sat)
  fri.setDate(sat.getDate() + 6)
  fri.setHours(23, 59, 59, 999)

  const startY = sat.getFullYear()
  const startM = String(sat.getMonth() + 1).padStart(2, '0')
  const startD = String(sat.getDate()).padStart(2, '0')
  const startDateStr = `${startY}-${startM}-${startD}`

  const endY = fri.getFullYear()
  const endM = String(fri.getMonth() + 1).padStart(2, '0')
  const endD = String(fri.getDate()).padStart(2, '0')
  const endDateStr = `${endY}-${endM}-${endD}`

  // Check if today falls in this cycle
  const isCurrent = forceCurrent ?? (now >= sat && now <= fri)

  // Current day in cycle
  const currentDay = now.getDay()
  const currentDiff = (currentDay + 1) % 7
  const dayIndex = isCurrent ? currentDiff + 1 : 7
  const dayName = isCurrent ? DAY_NAMES[currentDay] : 'Friday'
  const isFriday = isCurrent ? currentDay === 5 : false
  const daysRemaining = isCurrent ? Math.max(0, 6 - currentDiff) : 0

  const formatShort = (dt: Date) =>
    dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const formatFull = (dt: Date) =>
    dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

  const id = `cycle_${startDateStr}`
  const shortLabel = `${formatShort(sat)} – ${formatShort(fri)}`
  const label = `${formatFull(sat)} – ${formatFull(fri)}`

  return {
    id,
    startDate: sat,
    endDate: fri,
    startDateStr,
    endDateStr,
    label,
    shortLabel,
    isCurrent,
    dayIndex,
    dayName,
    daysRemaining,
    isFriday,
  }
}

/**
 * Returns the current active Saturday-to-Friday week cycle.
 */
export function getCurrentWeekCycle(): WeekCycle {
  return getWeekCycleForDate(new Date(), true)
}

/**
 * Returns a list of recent Saturday-to-Friday week cycles (e.g. past 16 weeks)
 */
export function getRecentWeekCycles(count = 16): WeekCycle[] {
  const cycles: WeekCycle[] = []
  const current = getCurrentWeekCycle()
  cycles.push(current)

  for (let i = 1; i < count; i++) {
    const pastDate = new Date(current.startDate)
    pastDate.setDate(pastDate.getDate() - 7 * i)
    cycles.push(getWeekCycleForDate(pastDate, false))
  }

  return cycles
}

/**
 * Available months for filtering
 */
export function getMonthOptions(): { value: number; label: string }[] {
  return MONTH_NAMES.map((name, idx) => ({
    value: idx + 1,
    label: name,
  }))
}

/**
 * Available years for filtering (current year - 2 down to current year + 1)
 */
export function getYearOptions(): number[] {
  const cur = new Date().getFullYear()
  return [cur + 1, cur, cur - 1, cur - 2]
}

/**
 * Check if a date string ("YYYY-MM-DD" or ISO) falls within a Saturday-Friday week cycle.
 */
export function isDateInCycle(dateStr: string, cycle: WeekCycle): boolean {
  if (!dateStr) return false
  const d = dateStr.slice(0, 10)
  return d >= cycle.startDateStr && d <= cycle.endDateStr
}

/**
 * Check if a date string falls in a given year and month (1-12).
 */
export function isDateInMonth(dateStr: string, year: number, month: number): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return false
  return d.getFullYear() === year && d.getMonth() + 1 === month
}

/**
 * Check if a date string falls in a given year.
 */
export function isDateInYear(dateStr: string, year: number): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return false
  return d.getFullYear() === year
}
