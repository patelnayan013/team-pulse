import { Card, CardContent } from '@/components/ui/card'

interface StatsCardsProps {
  checkinsSubmitted: number
  checkinsTotal: number
  openBlockers: number
  qaQueueCount: number
  pendingTasksCount: number
}

export function StatsCards({
  checkinsSubmitted,
  checkinsTotal,
  openBlockers,
  qaQueueCount,
  pendingTasksCount,
}: StatsCardsProps) {
  const stats = [
    {
      label: 'Check-ins Today',
      value: `${checkinsSubmitted}/${checkinsTotal}`,
      color: checkinsSubmitted === checkinsTotal ? 'text-green-600' : 'text-amber-600',
      icon: '📝',
    },
    {
      label: 'Open Blockers',
      value: openBlockers,
      color: openBlockers > 0 ? 'text-red-600' : 'text-green-600',
      icon: '🚧',
    },
    {
      label: 'QA Queue',
      value: qaQueueCount,
      color: 'text-blue-600',
      icon: '🔍',
    },
    {
      label: 'Pending Tasks',
      value: pendingTasksCount,
      color: pendingTasksCount > 0 ? 'text-amber-600' : 'text-green-600',
      icon: '⏳',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <span className="text-2xl">{stat.icon}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
