import type { Checkin, CheckinTaskItem, Profile } from '@/types'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

interface TelegramResponse {
  ok: boolean
  result?: unknown
  description?: string
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not configured')
    return false
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`

  // Telegram has a 4096 character limit, split if needed
  const messages = splitMessage(text, 4000)

  for (const message of messages) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
      }),
    })

    const data: TelegramResponse = await response.json()

    if (!data.ok) {
      console.error('Telegram API error:', data.description)
      return false
    }
  }

  return true
}

export async function sendEODSummary(
  checkins: (Checkin & { user: Profile })[],
  allMembers: Profile[],
  date: string
): Promise<boolean> {
  if (!TELEGRAM_CHAT_ID) {
    console.error('TELEGRAM_CHAT_ID is not configured')
    return false
  }

  const message = formatEODSummary(checkins, allMembers, date)
  return sendTelegramMessage(TELEGRAM_CHAT_ID, message)
}

function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text]

  const messages: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      messages.push(remaining)
      break
    }

    // Find a good break point (newline)
    let breakPoint = remaining.lastIndexOf('\n', maxLength)
    if (breakPoint === -1 || breakPoint < maxLength / 2) {
      breakPoint = maxLength
    }

    messages.push(remaining.substring(0, breakPoint))
    remaining = remaining.substring(breakPoint).trimStart()
  }

  return messages
}

function getMoodEmoji(mood: number | null): string {
  if (mood === null) return ''
  const moods: Record<number, string> = {
    1: '😫 Struggling',
    2: '😕 Difficult',
    3: '😐 Okay',
    4: '🙂 Good',
    5: '😊 Great',
  }
  return moods[mood] || ''
}

function formatTaskItem(task: CheckinTaskItem, type: 'completed' | 'pending'): string {
  let line = `  • ${escapeHtml(task.title)}`

  if (type === 'completed') {
    const badges: string[] = []
    if (task.qa_done) badges.push('QA ✓')
    if (task.pr_submitted) badges.push('PR ✓')
    if (badges.length > 0) {
      line += ` <code>[${badges.join('] [')}]</code>`
    }
  } else {
    if (task.is_blocked) {
      line += ' 🚧'
      if (task.blocker_description) {
        line += ` - <i>${escapeHtml(task.blocker_description)}</i>`
      }
    }
  }

  return line
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function formatEODSummary(
  checkins: (Checkin & { user: Profile })[],
  allMembers: Profile[],
  date: string
): string {
  const devMembers = allMembers.filter((m) => m.role !== 'lead')
  const totalMembers = devMembers.length
  const checkinCount = checkins.length

  // Format date nicely
  const dateObj = new Date(date + 'T00:00:00')
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const lines: string[] = []

  // Header
  lines.push(`📊 <b>EOD Summary - ${formattedDate}</b>`)
  lines.push('')

  // Show who submitted
  if (checkinCount > 0) {
    const submittedNames = checkins
      .map((c) => c.user?.full_name || c.user?.email || 'Unknown')
      .join(', ')
    lines.push(`👥 Check-ins: <b>${checkinCount}/${totalMembers}</b>${checkinCount < totalMembers ? ` (${totalMembers - checkinCount} missing)` : ' ✅'}`)
    lines.push(`✅ Submitted: ${submittedNames}`)
  } else {
    lines.push(`👥 Check-ins: <b>0/${totalMembers}</b>`)
    lines.push(`⚠️ No check-ins submitted yet`)
  }

  lines.push('')
  lines.push('━━━━━━━━━━━━━━━━━━━━')

  // Stats tracking
  let totalCompleted = 0
  let totalBlockers = 0
  let moodSum = 0
  let moodCount = 0

  // Per-developer summary
  for (const checkin of checkins) {
    const userName = checkin.user?.full_name || checkin.user?.email || 'Unknown'
    lines.push('')
    lines.push(`👤 <b>${escapeHtml(userName)}</b>`)

    // Completed tasks
    const completed = checkin.tasks_completed || []
    if (completed.length > 0) {
      totalCompleted += completed.length
      lines.push(`✅ Completed (${completed.length}):`)
      for (const task of completed) {
        lines.push(formatTaskItem(task, 'completed'))
      }
    }

    // Pending tasks
    const pending = checkin.tasks_pending || []
    if (pending.length > 0) {
      const blockedTasks = pending.filter((t) => t.is_blocked)
      totalBlockers += blockedTasks.length

      if (blockedTasks.length > 0) {
        lines.push(`🚧 Blocked (${blockedTasks.length}):`)
        for (const task of blockedTasks) {
          lines.push(formatTaskItem(task, 'pending'))
        }
      }

      const nonBlockedTasks = pending.filter((t) => !t.is_blocked)
      if (nonBlockedTasks.length > 0) {
        lines.push(`⏳ Pending (${nonBlockedTasks.length}):`)
        for (const task of nonBlockedTasks) {
          lines.push(formatTaskItem(task, 'pending'))
        }
      }
    }

    // Notes for lead
    if (checkin.notes_for_lead) {
      lines.push(`📝 Note: <i>${escapeHtml(checkin.notes_for_lead)}</i>`)
    }

    // Mood
    if (checkin.mood) {
      moodSum += checkin.mood
      moodCount++
      lines.push(`💭 Mood: ${getMoodEmoji(checkin.mood)}`)
    }

    lines.push('')
    lines.push('━━━━━━━━━━━━━━━━━━━━')
  }

  // Missing check-ins
  const submittedUserIds = new Set(checkins.map((c) => c.user_id))
  const missingMembers = devMembers.filter((m) => !submittedUserIds.has(m.id))

  if (missingMembers.length > 0) {
    lines.push('')
    lines.push('⚠️ <b>Missing Check-ins:</b>')
    for (const member of missingMembers) {
      lines.push(`  • ${escapeHtml(member.full_name || member.email)}`)
    }
  }

  // Aggregate stats
  lines.push('')
  lines.push('📈 <b>Summary:</b>')
  lines.push(`• Total tasks completed: ${totalCompleted}`)
  lines.push(`• Total blockers: ${totalBlockers}`)
  if (moodCount > 0) {
    const avgMood = (moodSum / moodCount).toFixed(1)
    lines.push(`• Average mood: ${avgMood}/5`)
  }

  return lines.join('\n')
}
