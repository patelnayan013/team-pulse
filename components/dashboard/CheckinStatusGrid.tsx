import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { Profile, Checkin } from '@/types'

interface CheckinStatusGridProps {
  members: Profile[]
  checkins: Checkin[]
}

export function CheckinStatusGrid({ members, checkins }: CheckinStatusGridProps) {
  // Filter to only show devs and QA (not leads)
  const teamMembers = members.filter((m) => m.role !== 'lead' && m.is_active)

  const getCheckinForMember = (userId: string) => {
    return checkins.find((c) => c.user_id === userId)
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return email[0].toUpperCase()
  }

  const getMoodEmoji = (mood: number | null) => {
    const moods = ['', '😫', '😕', '😐', '🙂', '😊']
    return mood ? moods[mood] : ''
  }

  // Count PRs submitted from completed tasks
  const getPRCount = (checkin: Checkin) => {
    return (checkin.tasks_completed || []).filter((t) => t.pr_submitted).length
  }

  if (teamMembers.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No team members yet. Invite your team to get started.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Today&apos;s Check-ins</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {teamMembers.map((member) => {
          const checkin = getCheckinForMember(member.id)
          const hasSubmitted = !!checkin

          return (
            <Card
              key={member.id}
              className={`transition-colors ${
                hasSubmitted
                  ? 'border-green-500/50 bg-green-500/5'
                  : 'border-amber-500/50 bg-amber-500/5'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                    <AvatarFallback className="text-xs">
                      {getInitials(member.full_name, member.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {member.full_name || member.email.split('@')[0]}
                      </p>
                      <Badge variant={member.role === 'qa' ? 'secondary' : 'outline'} className="text-xs">
                        {member.role.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <Badge variant={hasSubmitted ? 'success' : 'warning'}>
                    {hasSubmitted ? 'Submitted' : 'Pending'}
                  </Badge>
                  {checkin && (
                    <div className="flex items-center gap-2 text-sm">
                      {checkin.has_blocker && (
                        <Badge variant="destructive" className="text-xs">
                          Blocked
                        </Badge>
                      )}
                      {checkin.mood && (
                        <span className="text-lg" title={`Mood: ${checkin.mood}/5`}>
                          {getMoodEmoji(checkin.mood)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {checkin && (
                  <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Completed: {checkin.tasks_completed?.length || 0}</span>
                      <span>Pending: {checkin.tasks_pending?.length || 0}</span>
                    </div>
                    {getPRCount(checkin) > 0 && (
                      <p className="mt-1 text-green-600 dark:text-green-400">
                        {getPRCount(checkin)} PR{getPRCount(checkin) > 1 ? 's' : ''} submitted
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
