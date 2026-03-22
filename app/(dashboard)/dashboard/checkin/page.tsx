import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CheckinForm } from '@/components/checkin/CheckinForm'
import type { Task } from '@/types'

export default async function CheckinPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Get tasks assigned to this user (active, in_progress, pending, blocked)
  const { data: assignedTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('assignee_id', user.id)
    .in('status', ['active', 'in_progress', 'pending', 'blocked'])
    .order('priority', { ascending: false })

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto mb-8">
        <h1 className="text-2xl font-semibold mb-2">EOD Check-in</h1>
        <p className="text-muted-foreground">
          Share your daily progress with your team lead.
        </p>
      </div>

      <CheckinForm assignedTasks={(assignedTasks || []) as Task[]} />
    </div>
  )
}
