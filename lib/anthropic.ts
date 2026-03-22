import Anthropic from '@anthropic-ai/sdk'
import type { Checkin, Profile, Task } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface BriefingInput {
  date: string
  checkins: (Checkin & { user: Profile })[]
  allMembers: Profile[]
  openBlockers: Task[]
  pendingTasks: Task[]
  qaQueue: Task[]
}

export async function generateDailyBriefing(input: BriefingInput): Promise<string> {
  const missingMembers = input.allMembers
    .filter((m) => m.role !== 'lead' && m.is_active)
    .filter((m) => !input.checkins.find((c) => c.user_id === m.id))
    .map((m) => m.full_name || m.email)

  // Calculate pending tasks 2+ days
  const longPendingTasks = input.pendingTasks.filter((t) => {
    if (!t.pending_since) return false
    const days = Math.floor(
      (Date.now() - new Date(t.pending_since).getTime()) / 86400000
    )
    return days >= 2
  })

  // Extract blockers from checkins (now per-task)
  const checkinsWithBlockers = input.checkins.filter((c) => c.has_blocker)

  const prompt = `You are a team intelligence assistant for a software development team.

Today's date: ${input.date}
Total active devs: ${input.allMembers.filter((m) => m.role === 'dev').length}
Check-ins received: ${input.checkins.length}
Missing check-ins from: ${missingMembers.length > 0 ? missingMembers.join(', ') : 'none — full attendance'}

EOD CHECK-INS:
${input.checkins
  .map(
    (c) => {
      // Extract QA and PR status from completed tasks
      const completedTasks = c.tasks_completed || []
      const tasksWithQA = completedTasks.filter((t) => t.qa_done).length
      const tasksWithPR = completedTasks.filter((t) => t.pr_submitted).length

      // Extract blockers from pending tasks
      const pendingTasks = c.tasks_pending || []
      const blockedTasks = pendingTasks.filter((t) => t.is_blocked)

      return `
Dev: ${c.user?.full_name || c.user?.email}
Tasks completed: ${completedTasks.map((t) => t.title).join(', ') || 'none'}
Tasks pending: ${pendingTasks.map((t) => `${t.title} (${t.notes || 'no reason'})`).join(', ') || 'none'}
Blockers: ${blockedTasks.length > 0 ? blockedTasks.map((t) => `${t.title}: ${t.blocker_description}`).join('; ') : 'none'}
QA completed: ${tasksWithQA}/${completedTasks.length} tasks
PRs submitted: ${tasksWithPR}/${completedTasks.length} tasks
${c.notes_for_lead ? `Note for lead: ${c.notes_for_lead}` : ''}
`
    }
  )
  .join('\n---\n')}

OPEN BLOCKERS (across all tasks): ${input.openBlockers.length}
${input.openBlockers.map((t) => `- ${t.title}: ${t.blocker_description}`).join('\n')}

TASKS PENDING 2+ DAYS: ${longPendingTasks.length}
${longPendingTasks.map((t) => `- ${t.title} (${t.assignee?.full_name || t.assignee?.email || 'unassigned'})`).join('\n')}

QA QUEUE (awaiting QA): ${input.qaQueue.length} tasks

Write a concise daily briefing for the tech lead. Format:
1. One-line status summary (good/needs attention/critical)
2. Key achievements today (bullet points, max 3)
3. Issues requiring lead attention (bullet points — missing check-ins, blockers, overdue tasks, QA gaps)
4. Tomorrow watch list (what to keep an eye on)

Keep total length under 200 words. Be direct and specific. Use dev names. Flag urgently if a blocker is 2+ days old or QA was skipped for completed tasks.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  })

  return message.content[0].type === 'text' ? message.content[0].text : ''
}

// Helper function to analyze check-in data for issues
export function analyzeCheckins(checkins: Checkin[]): {
  issuesFound: boolean
  issues: string[]
} {
  const issues: string[] = []

  for (const checkin of checkins) {
    const completedTasks = checkin.tasks_completed || []
    const pendingTasks = checkin.tasks_pending || []

    // Check if any completed task is missing QA
    const tasksWithoutQA = completedTasks.filter((t) => !t.qa_done)
    if (tasksWithoutQA.length > 0) {
      issues.push(
        `QA not completed for ${tasksWithoutQA.length} task(s) by ${(checkin.user as Profile)?.full_name || (checkin.user as Profile)?.email}`
      )
    }

    // Check for blockers in pending tasks
    const blockedTasks = pendingTasks.filter((t) => t.is_blocked)
    for (const task of blockedTasks) {
      issues.push(
        `Blocker on "${task.title}" by ${(checkin.user as Profile)?.full_name || (checkin.user as Profile)?.email}: ${task.blocker_description}`
      )
    }
  }

  return {
    issuesFound: issues.length > 0,
    issues,
  }
}
