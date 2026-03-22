'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TaskStatusBadge } from './TaskStatusBadge'
import { ExternalLink, Trash2, Edit2, User, Calendar, AlertTriangle } from 'lucide-react'
import type { Task, TaskPriority } from '@/types'

const priorityConfig: Record<TaskPriority, { color: string; label: string }> = {
  low: { color: 'bg-green-500', label: 'Low' },
  medium: { color: 'bg-amber-500', label: 'Medium' },
  high: { color: 'bg-orange-500', label: 'High' },
  critical: { color: 'bg-red-500', label: 'Critical' },
}

interface TaskCardProps {
  task: Task
  isLead: boolean
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
}

export function TaskCard({ task, isLead, onEdit, onDelete }: TaskCardProps) {
  const [deleting, setDeleting] = useState(false)
  const priority = priorityConfig[task.priority]

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
      if (res.ok) {
        onDelete?.(task.id)
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className={`${task.status === 'blocked' ? 'border-red-500/50 bg-red-50/50 dark:bg-red-950/20' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-2 w-2 rounded-full ${priority.color}`} title={priority.label} />
              <h3 className="font-medium truncate">{task.title}</h3>
              {task.task_link && (
                <a
                  href={task.task_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700 flex-shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>

            {task.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <TaskStatusBadge status={task.status} />

              {task.assignee && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  {task.assignee.full_name || task.assignee.email}
                </span>
              )}

              {task.due_date && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(task.due_date).toLocaleDateString()}
                </span>
              )}

              {task.status === 'blocked' && task.blocker_description && (
                <span className="inline-flex items-center gap-1 text-xs text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  {task.blocker_description}
                </span>
              )}
            </div>
          </div>

          {isLead && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit?.(task)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-700"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
