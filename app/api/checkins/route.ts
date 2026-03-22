import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema for completed task items
const completedTaskSchema = z.object({
  task_id: z.string().uuid().optional(),
  title: z.string(),
  task_link: z.string().optional(),
  status: z.string(),
  notes: z.string().optional(),
  qa_done: z.boolean().optional(),
  pr_submitted: z.boolean().optional(),
  pr_url: z.string().optional(),
})

// Schema for pending task items
const pendingTaskSchema = z.object({
  task_id: z.string().uuid().optional(),
  title: z.string(),
  task_link: z.string().optional(),
  status: z.string(),
  notes: z.string().optional(),
  is_blocked: z.boolean().optional(),
  blocker_description: z.string().optional(),
})

// Schema for creating/updating a checkin
const checkinSchema = z.object({
  tasks_completed: z.array(completedTaskSchema).default([]),
  tasks_pending: z.array(pendingTaskSchema).default([]),
  has_blocker: z.boolean().default(false),
  notes_for_lead: z.string().optional().nullable(),
  mood: z.number().int().min(1).max(5).optional().nullable(),
})

// GET /api/checkins - List checkins
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const userId = searchParams.get('user_id')

  // Build query
  let query = supabase
    .from('checkins')
    .select('*, user:profiles(*)')
    .order('submitted_at', { ascending: false })

  if (date) {
    query = query.eq('checkin_date', date)
  }

  if (userId) {
    // Non-leads can only see their own checkins
    if (profile?.role !== 'lead' && userId !== user.id) {
      return NextResponse.json({ error: 'Can only view your own checkins' }, { status: 403 })
    }
    query = query.eq('user_id', userId)
  } else if (profile?.role !== 'lead') {
    // Non-leads only see their own by default
    query = query.eq('user_id', user.id)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ checkins: data })
}

// POST /api/checkins - Submit a daily checkin
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = checkinSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]

  // Upsert checkin (one per user per day)
  const { data, error } = await supabase
    .from('checkins')
    .upsert(
      {
        user_id: user.id,
        checkin_date: today,
        tasks_completed: parsed.data.tasks_completed,
        tasks_pending: parsed.data.tasks_pending,
        has_blocker: parsed.data.has_blocker,
        notes_for_lead: parsed.data.notes_for_lead,
        mood: parsed.data.mood,
        submitted_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,checkin_date',
      }
    )
    .select('*, user:profiles(*)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update task statuses based on check-in data (only for tasks with task_id)
  // Process completed tasks
  for (const task of parsed.data.tasks_completed) {
    if (task.task_id) {
      // Determine status: if QA done, move to in_qa; otherwise done
      const newStatus = task.qa_done ? 'in_qa' : 'done'
      await supabase
        .from('tasks')
        .update({
          status: newStatus,
          github_pr_url: task.pr_url || null,
          completed_at: newStatus === 'done' ? new Date().toISOString() : null,
        })
        .eq('id', task.task_id)
    }
  }

  // Process pending tasks
  for (const task of parsed.data.tasks_pending) {
    if (task.task_id) {
      if (task.is_blocked) {
        // Mark as blocked
        await supabase
          .from('tasks')
          .update({
            status: 'blocked',
            blocked_since: today,
            blocker_description: task.blocker_description || null,
          })
          .eq('id', task.task_id)
      } else {
        // Mark as pending
        await supabase
          .from('tasks')
          .update({
            status: 'pending',
            pending_since: today,
          })
          .eq('id', task.task_id)
      }
    }
  }

  return NextResponse.json({ checkin: data }, { status: 201 })
}
