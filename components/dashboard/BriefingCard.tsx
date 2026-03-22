import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Briefing } from '@/types'

interface BriefingCardProps {
  briefing: Briefing
}

export function BriefingCard({ briefing }: BriefingCardProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl">Daily Briefing</CardTitle>
            <Badge variant={briefing.issues_found ? 'warning' : 'success'}>
              {briefing.issues_found ? 'Needs Attention' : 'All Good'}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{briefing.checkin_count}/{briefing.member_count} check-ins</span>
          </div>
        </div>
        <CardDescription>{formatDate(briefing.briefing_date)}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {briefing.content.split('\n').map((paragraph, i) => (
            <p key={i} className="mb-2 last:mb-0">
              {paragraph}
            </p>
          ))}
        </div>

        {briefing.missing_checkins && briefing.missing_checkins.length > 0 && (
          <div className="mt-4 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Missing check-ins: {briefing.missing_checkins.join(', ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
