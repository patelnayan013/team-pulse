import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Eye,
  MessageSquare,
} from 'lucide-react'
import Link from 'next/link'
import type { Checkin, Profile } from '@/types'

export default async function TasksPage() {
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

  // Get today and recent dates
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Get last 7 days
  const last7Days = new Date(today)
  last7Days.setDate(today.getDate() - 7)
  const last7DaysStr = last7Days.toISOString().split('T')[0]

  // Fetch check-ins based on role
  let checkinsQuery = supabase
    .from('checkins')
    .select('*, user:profiles(*)')
    .gte('checkin_date', last7DaysStr)
    .order('submitted_at', { ascending: false })

  // Non-leads only see their own check-ins
  if (!isLead) {
    checkinsQuery = checkinsQuery.eq('user_id', user.id)
  }

  const { data: checkins } = await checkinsQuery

  // Group check-ins by date
  const checkinsByDate: Record<string, Checkin[]> = {}
  ;(checkins || []).forEach((checkin: Checkin) => {
    const date = checkin.checkin_date
    if (!checkinsByDate[date]) {
      checkinsByDate[date] = []
    }
    checkinsByDate[date].push(checkin)
  })

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    if (dateStr === todayStr) return 'Today'
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday'
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const getMoodEmoji = (mood: number | null) => {
    const moods: Record<number, string> = {
      1: '😫',
      2: '😕',
      3: '😐',
      4: '🙂',
      5: '😊',
    }
    return mood ? moods[mood] || '😐' : null
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {isLead ? 'Team Check-ins' : 'My Check-ins'}
          </h1>
          <p className="text-muted-foreground">
            {isLead
              ? 'View all team member submissions'
              : 'Your recent EOD submissions'}
          </p>
        </div>
        {!isLead && (
          <Link href="/dashboard/checkin">
            <Button>Submit Today&apos;s Check-in</Button>
          </Link>
        )}
      </div>

      {/* Check-ins by date */}
      {Object.keys(checkinsByDate).length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium mb-2">No Check-ins Found</h3>
            <p className="text-muted-foreground mb-4">
              {isLead
                ? 'No team members have submitted check-ins in the last 7 days'
                : "You haven't submitted any check-ins recently"}
            </p>
            {!isLead && (
              <Link href="/dashboard/checkin">
                <Button>Submit Check-in</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        Object.entries(checkinsByDate)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, dateCheckins]) => (
            <div key={date} className="space-y-4">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                {formatDate(date)}
                <span className="text-sm text-muted-foreground font-normal">
                  ({dateCheckins.length} submission{dateCheckins.length !== 1 ? 's' : ''})
                </span>
              </h2>

              <div className="grid gap-4">
                {dateCheckins.map((checkin: Checkin) => {
                  const completedCount = checkin.tasks_completed?.length || 0
                  const pendingCount = checkin.tasks_pending?.length || 0
                  const hasBlocker = checkin.has_blocker
                  const userProfile = checkin.user as Profile | undefined

                  return (
                    <Card
                      key={checkin.id}
                      className={hasBlocker ? 'border-red-500/50' : ''}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* User info */}
                            <div className="flex items-center gap-3 mb-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-sm font-medium">
                                  {(userProfile?.full_name || userProfile?.email || '?')
                                    .split(' ')
                                    .map((n: string) => n[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">
                                  {userProfile?.full_name || userProfile?.email?.split('@')[0]}
                                </p>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(checkin.submitted_at).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                  {checkin.mood && (
                                    <span className="ml-2">{getMoodEmoji(checkin.mood)}</span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Stats */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {completedCount} completed
                              </Badge>
                              {pendingCount > 0 && (
                                <Badge variant="secondary">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {pendingCount} pending
                                </Badge>
                              )}
                              {hasBlocker && (
                                <Badge variant="destructive">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Has blocker
                                </Badge>
                              )}
                              {checkin.notes_for_lead && (
                                <Badge variant="outline">
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  Has notes
                                </Badge>
                              )}
                            </div>

                            {/* Task preview */}
                            {completedCount > 0 && (
                              <div className="space-y-1">
                                {checkin.tasks_completed.slice(0, 2).map((task, i) => (
                                  <div
                                    key={i}
                                    className="text-sm flex items-center gap-2 text-muted-foreground"
                                  >
                                    <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                                    <span className="truncate">{task.title}</span>
                                    {task.task_link && (
                                      <a
                                        href={task.task_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:text-blue-700 shrink-0"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                  </div>
                                ))}
                                {completedCount > 2 && (
                                  <p className="text-xs text-muted-foreground">
                                    +{completedCount - 2} more
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* View button */}
                          <Link href={`/dashboard/checkins/${checkin.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))
      )}
    </div>
  )
}
