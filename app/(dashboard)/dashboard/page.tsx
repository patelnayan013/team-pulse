import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ClipboardCheck,
  AlertTriangle,
  CheckSquare,
  Clock,
  TrendingUp,
  Users,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import type { Task, Profile, Checkin } from '@/types'

export default async function DashboardPage() {
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
  const userName = profile?.full_name || user.email?.split('@')[0] || 'User'

  // Get today's date
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  }

  // Calculate start of week (Monday)
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay() + 1)
  const startOfWeekStr = startOfWeek.toISOString().split('T')[0]

  // Fetch real data
  const [
    { data: allProfiles },
    { data: todayCheckins },
    { data: blockedTasks },
    { data: qaTasks },
    { data: pendingTasks },
    { data: completedThisWeek },
    { data: myTasks },
  ] = await Promise.all([
    // All team members
    supabase.from('profiles').select('*').eq('is_active', true),
    // Today's check-ins
    supabase.from('checkins').select('*, user:profiles(*)').eq('checkin_date', todayStr),
    // Blocked tasks
    supabase.from('tasks').select('*, assignee:profiles(*)').eq('status', 'blocked'),
    // QA queue
    supabase.from('tasks').select('*').eq('status', 'in_qa'),
    // Pending tasks
    supabase.from('tasks').select('*').eq('status', 'pending'),
    // Completed this week
    supabase.from('tasks').select('*').eq('status', 'done').gte('completed_at', startOfWeekStr),
    // My tasks (for devs and qa)
    (userRole === 'dev' || userRole === 'qa')
      ? supabase.from('tasks').select('*, assignee:profiles(*)').eq('assignee_id', user.id).neq('status', 'done').order('priority', { ascending: false }).limit(5)
      : { data: [] },
  ])

  const stats = {
    checkinsToday: todayCheckins?.length || 0,
    totalTeamMembers: allProfiles?.length || 0,
    openBlockers: blockedTasks?.length || 0,
    qaQueue: qaTasks?.length || 0,
    pendingTasks: pendingTasks?.length || 0,
    completedThisWeek: completedThisWeek?.length || 0,
  }

  // Get team members who haven't checked in today
  const checkedInUserIds = new Set(todayCheckins?.map((c: Checkin) => c.user_id) || [])
  const teamWithStatus = (allProfiles || []).map((member: Profile) => ({
    ...member,
    hasCheckedIn: checkedInUserIds.has(member.id),
  }))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back, {userName}!</h1>
          <p className="text-muted-foreground">{formatDate(today)}</p>
        </div>
        {(userRole === 'dev' || userRole === 'qa') && (
          <Link href="/dashboard/checkin">
            <Button>
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Submit EOD Check-in
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Check-ins Today
            </CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.checkinsToday}/{stats.totalTeamMembers}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalTeamMembers - stats.checkinsToday} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Blockers
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openBlockers}</div>
            <p className="text-xs text-muted-foreground">
              Needs attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              QA Queue
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.qaQueue}</div>
            <p className="text-xs text-muted-foreground">
              Ready for review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed This Week
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              Tasks closed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Check-ins (Lead) / My Tasks (Dev/QA) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {userRole === 'lead' ? (
                <>
                  <ClipboardCheck className="h-5 w-5" />
                  Recent Check-ins
                </>
              ) : (
                <>
                  <Clock className="h-5 w-5" />
                  My Tasks
                </>
              )}
            </CardTitle>
            <CardDescription>
              {userRole === 'lead'
                ? "Today's team submissions"
                : 'Tasks assigned to you'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {userRole === 'lead' ? (
              // Show recent check-ins for leads
              (todayCheckins || []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p>No check-ins submitted today</p>
                </div>
              ) : (
                (todayCheckins || []).slice(0, 4).map((checkin: Checkin) => {
                  const checkinUser = checkin.user as Profile | undefined
                  const completedCount = checkin.tasks_completed?.length || 0
                  return (
                    <Link
                      key={checkin.id}
                      href={`/dashboard/checkins/${checkin.id}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-medium">
                            {(checkinUser?.full_name || checkinUser?.email || '?')
                              .split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate text-sm">
                            {checkinUser?.full_name || checkinUser?.email?.split('@')[0]}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {completedCount} task{completedCount !== 1 ? 's' : ''} completed
                          </p>
                        </div>
                      </div>
                      {checkin.has_blocker && (
                        <Badge variant="destructive" className="shrink-0">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Blocker
                        </Badge>
                      )}
                    </Link>
                  )
                })
              )
            ) : (
              // Show tasks for devs/qa
              (myTasks || []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckSquare className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No active tasks</p>
                </div>
              ) : (
                (myTasks || []).map((task: Task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          task.priority === 'critical'
                            ? 'bg-red-600'
                            : task.priority === 'high'
                            ? 'bg-orange-500'
                            : task.priority === 'medium'
                            ? 'bg-amber-500'
                            : 'bg-green-500'
                        }`}
                      />
                      <span className="font-medium truncate">{task.title}</span>
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
                    <Badge
                      variant={
                        task.status === 'in_progress'
                          ? 'default'
                          : task.status === 'blocked'
                          ? 'destructive'
                          : task.status === 'pending'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))
              )
            )}
            <Link href="/dashboard/tasks" className="block">
              <Button variant="ghost" className="w-full">
                {userRole === 'lead' ? 'View all check-ins' : 'View all tasks'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Blockers / QA Queue */}
        <Card className={stats.openBlockers > 0 ? 'border-amber-500/50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Open Blockers
              {stats.openBlockers > 0 && (
                <Badge variant="destructive">{stats.openBlockers}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Issues blocking progress
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.openBlockers === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckSquare className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>No blockers! Great work team!</p>
              </div>
            ) : (
              <>
                {(blockedTasks || []).slice(0, 5).map((task: Task) => {
                  const daysBlocked = task.blocked_since
                    ? Math.floor((Date.now() - new Date(task.blocked_since).getTime()) / (1000 * 60 * 60 * 24))
                    : 0
                  return (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg border border-amber-500/50 bg-amber-500/5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{task.title}</span>
                        <Badge variant="destructive" className="shrink-0">{daysBlocked}d</Badge>
                      </div>
                      {task.blocker_description && (
                        <p className="text-sm text-red-600 mt-1 line-clamp-1">
                          {task.blocker_description}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.assignee
                          ? `Assigned to ${task.assignee.full_name || task.assignee.email}`
                          : 'Unassigned'}
                      </p>
                    </div>
                  )
                })}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Overview (Lead only) */}
      {userRole === 'lead' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Overview
            </CardTitle>
            <CardDescription>
              Check-in status for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teamWithStatus.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No team members yet
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {teamWithStatus.map((member) => (
                  <div
                    key={member.id}
                    className={`p-4 rounded-lg text-center ${
                      member.hasCheckedIn
                        ? 'bg-green-500/10 border border-green-500/30'
                        : 'bg-muted/50 border border-muted'
                    }`}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                      <span className="text-sm font-medium">
                        {(member.full_name || member.email || '?')
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    </div>
                    <p className="font-medium text-sm truncate">
                      {member.full_name || member.email?.split('@')[0]}
                    </p>
                    <Badge
                      variant={member.role === 'lead' ? 'default' : member.role === 'qa' ? 'outline' : 'secondary'}
                      className="mt-1 text-xs"
                    >
                      {member.role}
                    </Badge>
                    <div className="mt-2">
                      <Badge
                        variant={member.hasCheckedIn ? 'default' : 'secondary'}
                        className={member.hasCheckedIn ? 'bg-green-500' : ''}
                      >
                        {member.hasCheckedIn ? 'Submitted' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
