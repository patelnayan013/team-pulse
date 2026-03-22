'use client'

import { Badge } from '@/components/ui/badge'
import type { TaskStatus } from '@/types'

const statusConfig: Record<TaskStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning'; className?: string }> = {
  active: { label: 'Active', variant: 'outline' },
  pending: { label: 'Pending', variant: 'secondary' },
  in_progress: { label: 'In Progress', variant: 'default' },
  blocked: { label: 'Blocked', variant: 'destructive' },
  in_qa: { label: 'In QA', variant: 'warning', className: 'bg-purple-500 hover:bg-purple-600' },
  done: { label: 'Done', variant: 'default', className: 'bg-green-500 hover:bg-green-600' },
}

interface TaskStatusBadgeProps {
  status: TaskStatus
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.active

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}
