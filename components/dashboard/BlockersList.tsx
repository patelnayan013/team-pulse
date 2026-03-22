import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Task } from '@/types'

interface BlockersListProps {
  blockers: Task[]
}

export function BlockersList({ blockers }: BlockersListProps) {
  const getDaysBlocked = (blockedSince: string | null) => {
    if (!blockedSince) return 0
    const start = new Date(blockedSince)
    const now = new Date()
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getInitials = (name: string | null, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return email ? email[0].toUpperCase() : '?'
  }

  if (blockers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            No Blockers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Great news! No tasks are currently blocked.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-xl">⚠️</span>
          Open Blockers
          <Badge variant="destructive">{blockers.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {blockers.map((task) => {
          const days = getDaysBlocked(task.blocked_since)
          const isUrgent = days >= 2

          return (
            <div
              key={task.id}
              className={`p-3 rounded-md border ${
                isUrgent
                  ? 'border-red-500/50 bg-red-500/5'
                  : 'border-amber-500/50 bg-amber-500/5'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">{task.title}</h4>
                    <Badge variant={isUrgent ? 'destructive' : 'warning'} className="text-xs">
                      {days} day{days !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  {task.blocker_description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {task.blocker_description}
                    </p>
                  )}
                </div>
                {task.assignee && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      {task.assignee.avatar_url && (
                        <AvatarImage src={task.assignee.avatar_url} />
                      )}
                      <AvatarFallback className="text-xs">
                        {getInitials(task.assignee.full_name, task.assignee.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      {task.assignee.full_name || task.assignee.email.split('@')[0]}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
