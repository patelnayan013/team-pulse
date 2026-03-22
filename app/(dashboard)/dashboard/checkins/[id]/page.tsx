import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  GitPullRequest,
} from 'lucide-react'
import Link from 'next/link'
import type { Profile } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CheckinDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || 'dev'
  const isLead = userRole === 'lead'

  // Fetch the check-in
  const { data: checkin, error } = await supabase
    .from('checkins')
    .select('*, user:profiles(*)')
    .eq('id', id)
    .single()

  if (error || !checkin) {
    notFound()
  }

  // Non-leads can only view their own check-ins
  if (!isLead && checkin.user_id !== user.id) {
    redirect('/dashboard/tasks')
  }

  const checkinUser = checkin.user as Profile | undefined

  const getMoodInfo = (mood: number | null) => {
    const moods: Record<number, { emoji: string; label: string }> = {
      1: { emoji: '😫', label: 'Struggling' },
      2: { emoji: '😕', label: 'Difficult' },
      3: { emoji: '😐', label: 'Okay' },
      4: { emoji: '🙂', label: 'Good' },
      5: { emoji: '😊', label: 'Great' },
    }
    return mood ? moods[mood] : null
  }

  const moodInfo = getMoodInfo(checkin.mood)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <Link href="/dashboard/tasks">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Check-ins
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xl font-medium">
              {(checkinUser?.full_name || checkinUser?.email || '?')
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold">
              {checkinUser?.full_name || checkinUser?.email?.split('@')[0]}
            </h1>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(checkin.checkin_date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {new Date(checkin.submitted_at).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Mood */}
        {moodInfo && (
          <div className="text-center">
            <div className="text-4xl">{moodInfo.emoji}</div>
            <p className="text-sm text-muted-foreground">{moodInfo.label}</p>
          </div>
        )}
      </div>

      {/* Blocker warning */}
      {checkin.has_blocker && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <div>
              <p className="font-medium text-red-700 dark:text-red-400">
                This team member has blockers
              </p>
              <p className="text-sm text-red-600 dark:text-red-300">
                Check pending tasks below for details
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks Completed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            Tasks Completed
            <Badge variant="default" className="bg-green-500 ml-2">
              {checkin.tasks_completed?.length || 0}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!checkin.tasks_completed || checkin.tasks_completed.length === 0) ? (
            <p className="text-muted-foreground text-center py-4">
              No tasks completed
            </p>
          ) : (
            <div className="space-y-4">
              {checkin.tasks_completed.map((task: any, i: number) => (
                <div
                  key={i}
                  className="p-4 rounded-lg border bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium">{task.title}</h4>
                    {task.task_link && (
                      <a
                        href={task.task_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 flex items-center gap-1 text-sm shrink-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Task
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-2">
                    {task.qa_done && (
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        QA Done
                      </Badge>
                    )}
                    {task.pr_submitted && (
                      <Badge variant="outline" className="text-purple-600 border-purple-300">
                        <GitPullRequest className="h-3 w-3 mr-1" />
                        PR Submitted
                      </Badge>
                    )}
                  </div>

                  {task.pr_url && (
                    <a
                      href={task.pr_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                    >
                      <GitPullRequest className="h-3 w-3" />
                      {task.pr_url}
                    </a>
                  )}

                  {task.notes && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      &quot;{task.notes}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks Pending */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600">
            <Clock className="h-5 w-5" />
            Tasks Pending
            <Badge variant="secondary" className="ml-2">
              {checkin.tasks_pending?.length || 0}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!checkin.tasks_pending || checkin.tasks_pending.length === 0) ? (
            <p className="text-muted-foreground text-center py-4">
              No pending tasks
            </p>
          ) : (
            <div className="space-y-4">
              {checkin.tasks_pending.map((task: any, i: number) => (
                <div
                  key={i}
                  className={`p-4 rounded-lg border ${
                    task.is_blocked
                      ? 'bg-red-50/50 dark:bg-red-950/20 border-red-300 dark:border-red-900'
                      : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {task.is_blocked && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <h4 className="font-medium">{task.title}</h4>
                    </div>
                    {task.task_link && (
                      <a
                        href={task.task_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 flex items-center gap-1 text-sm shrink-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Task
                      </a>
                    )}
                  </div>

                  {task.is_blocked && (
                    <Badge variant="destructive" className="mb-2">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Blocked
                    </Badge>
                  )}

                  {task.blocker_description && (
                    <div className="mt-2 p-3 rounded bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800">
                      <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                        Blocker:
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {task.blocker_description}
                      </p>
                    </div>
                  )}

                  {task.notes && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      &quot;{task.notes}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes for Lead */}
      {checkin.notes_for_lead && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Notes for Lead
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-muted/50 border">
              <p className="whitespace-pre-wrap">{checkin.notes_for_lead}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
