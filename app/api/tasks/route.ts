import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema for creating a task
const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assignee_id: z.string().uuid().optional(),
  status: z.enum(['active', 'pending', 'in_progress', 'blocked', 'in_qa', 'done']).default('active'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  task_link: z.string().url().optional().or(z.literal('')),
  estimated_days: z.number().int().positive().optional(),
  qa_required: z.boolean().default(true),
  due_date: z.string().optional(),
})

// GET /api/tasks - List tasks
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const assigneeId = searchParams.get('assignee_id')

  // Build query
  let query = supabase
    .from('tasks')
    .select('*, assignee:profiles(*)')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  if (assigneeId) {
    query = query.eq('assignee_id', assigneeId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tasks: data })
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is a lead (only leads can create tasks)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'lead') {
    return NextResponse.json({ error: 'Only team leads can create tasks' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createTaskSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...parsed.data,
      task_link: parsed.data.task_link || null,
      created_by: user.id,
    })
    .select('*, assignee:profiles(*)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ task: data }, { status: 201 })
}
