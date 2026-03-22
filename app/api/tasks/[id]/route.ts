import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema for updating a task
const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  status: z.enum(['active', 'pending', 'in_progress', 'blocked', 'in_qa', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  task_link: z.string().url().nullable().optional().or(z.literal('')),
  estimated_days: z.number().int().positive().nullable().optional(),
  qa_required: z.boolean().optional(),
  qa_passed: z.boolean().nullable().optional(),
  due_date: z.string().nullable().optional(),
  blocker_description: z.string().nullable().optional(),
  github_pr_url: z.string().url().nullable().optional(),
})

// GET /api/tasks/[id] - Get a single task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .select('*, assignee:profiles(*)')
    .eq('id', id)
    .single()

  if (error || !task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  return NextResponse.json({ task })
}

// PATCH /api/tasks/[id] - Update a task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = updateTaskSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Get existing task
  const { data: existingTask } = await supabase
    .from('tasks')
    .select('status')
    .eq('id', id)
    .single()

  if (!existingTask) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  // Build update object with status-specific fields
  const updateData: Record<string, unknown> = { ...parsed.data }

  // Handle empty task_link
  if (parsed.data.task_link === '') {
    updateData.task_link = null
  }

  const today = new Date().toISOString().split('T')[0]

  // Track status changes
  if (parsed.data.status) {
    if (parsed.data.status === 'pending' && existingTask.status !== 'pending') {
      updateData.pending_since = today
    }
    if (parsed.data.status === 'blocked' && existingTask.status !== 'blocked') {
      updateData.blocked_since = today
    }
    if (parsed.data.status === 'done') {
      updateData.completed_at = new Date().toISOString()
    }
    // Clear blocked/pending dates if moving to other statuses
    if (parsed.data.status !== 'blocked') {
      updateData.blocked_since = null
      updateData.blocker_description = null
    }
    if (parsed.data.status !== 'pending') {
      updateData.pending_since = null
    }
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .select('*, assignee:profiles(*)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ task: data })
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is a lead
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'lead') {
    return NextResponse.json({ error: 'Only leads can delete tasks' }, { status: 403 })
  }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
