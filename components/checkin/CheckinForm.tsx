'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ExternalLink, Plus, Trash2 } from 'lucide-react'
import type { Task, CheckinTaskItem } from '@/types'

interface CheckinFormProps {
  assignedTasks?: Task[]
}

interface TaskEntry {
  id: string
  task_id: string | null
  title: string
  task_link: string
  status: string
  notes: string
  // For completed tasks
  qa_done?: boolean
  pr_submitted?: boolean
  pr_url?: string
  // For pending tasks
  is_blocked?: boolean
  blocker_description?: string
}

const moods = [
  { value: 1, emoji: '😫', label: 'Struggling' },
  { value: 2, emoji: '😕', label: 'Difficult' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😊', label: 'Great' },
]

export function CheckinForm({ assignedTasks }: CheckinFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [tasksCompleted, setTasksCompleted] = useState<TaskEntry[]>([])
  const [tasksPending, setTasksPending] = useState<TaskEntry[]>([])
  const [notesForLead, setNotesForLead] = useState('')
  const [mood, setMood] = useState<number | null>(null)

  // Helper to generate unique IDs
  const generateId = () => Math.random().toString(36).substring(7)

  // Add empty task to completed
  const addCompletedTask = () => {
    setTasksCompleted([
      ...tasksCompleted,
      {
        id: generateId(),
        task_id: null,
        title: '',
        task_link: '',
        status: 'done',
        notes: '',
        qa_done: false,
        pr_submitted: false,
        pr_url: '',
      },
    ])
  }

  // Add empty task to pending
  const addPendingTask = () => {
    setTasksPending([
      ...tasksPending,
      {
        id: generateId(),
        task_id: null,
        title: '',
        task_link: '',
        status: 'pending',
        notes: '',
        is_blocked: false,
        blocker_description: '',
      },
    ])
  }

  // Remove task
  const removeCompletedTask = (id: string) => {
    setTasksCompleted(tasksCompleted.filter((t) => t.id !== id))
  }

  const removePendingTask = (id: string) => {
    setTasksPending(tasksPending.filter((t) => t.id !== id))
  }

  // Update task
  const updateCompletedTask = (id: string, updates: Partial<TaskEntry>) => {
    setTasksCompleted(tasksCompleted.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }

  const updatePendingTask = (id: string, updates: Partial<TaskEntry>) => {
    setTasksPending(tasksPending.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formatCompletedTasks = (tasks: TaskEntry[]) =>
      tasks
        .filter((t) => t.title.trim()) // Only include tasks with titles
        .map((t) => ({
          task_id: t.task_id || undefined,
          title: t.title,
          task_link: t.task_link || undefined,
          status: t.status,
          notes: t.notes || undefined,
          qa_done: t.qa_done,
          pr_submitted: t.pr_submitted,
          pr_url: t.pr_url || undefined,
        }))

    const formatPendingTasks = (tasks: TaskEntry[]) =>
      tasks
        .filter((t) => t.title.trim()) // Only include tasks with titles
        .map((t) => ({
          task_id: t.task_id || undefined,
          title: t.title,
          task_link: t.task_link || undefined,
          status: t.status,
          notes: t.notes || undefined,
          is_blocked: t.is_blocked,
          blocker_description: t.is_blocked ? t.blocker_description : undefined,
        }))

    // Check if any task has a blocker
    const hasBlocker = tasksPending.some((t) => t.is_blocked)

    try {
      const response = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks_completed: formatCompletedTasks(tasksCompleted),
          tasks_pending: formatPendingTasks(tasksPending),
          has_blocker: hasBlocker,
          notes_for_lead: notesForLead || null,
          mood,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit check-in')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-12 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-2">Check-in Submitted!</h2>
          <p className="text-muted-foreground mb-6">
            Thanks for your update. See you tomorrow!
          </p>
          <Button onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive">
          {error}
        </div>
      )}

      {/* Section 1: Tasks Completed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            Tasks Completed Today
          </CardTitle>
          <CardDescription>
            Add tasks you finished working on
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tasksCompleted.map((task) => (
            <div key={task.id} className="p-4 border rounded-lg space-y-3 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
              <div className="flex gap-2 items-start">
                <div className="flex-1 space-y-3">
                  <Input
                    placeholder="Task title *"
                    value={task.title}
                    onChange={(e) => updateCompletedTask(task.id, { title: e.target.value })}
                    className="font-medium"
                  />
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder="Task link (Linear, Jira, etc.)"
                      value={task.task_link}
                      onChange={(e) => updateCompletedTask(task.id, { task_link: e.target.value })}
                      className="flex-1"
                    />
                    {task.task_link && (
                      <a
                        href={task.task_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 p-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCompletedTask(task.id)}
                  className="h-8 w-8 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* QA & PR per task */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-green-200 dark:border-green-900">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`qa-${task.id}`}
                    checked={task.qa_done || false}
                    onChange={(e) => updateCompletedTask(task.id, { qa_done: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor={`qa-${task.id}`} className="text-sm cursor-pointer">
                    QA checklist done
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`pr-${task.id}`}
                    checked={task.pr_submitted || false}
                    onChange={(e) => updateCompletedTask(task.id, { pr_submitted: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor={`pr-${task.id}`} className="text-sm cursor-pointer">
                    PR submitted
                  </Label>
                </div>
              </div>

              {task.pr_submitted && (
                <Input
                  type="url"
                  placeholder="PR URL (https://github.com/...)"
                  value={task.pr_url || ''}
                  onChange={(e) => updateCompletedTask(task.id, { pr_url: e.target.value })}
                />
              )}

              <Input
                placeholder="Notes (optional)"
                value={task.notes}
                onChange={(e) => updateCompletedTask(task.id, { notes: e.target.value })}
              />
            </div>
          ))}

          {/* Add task button */}
          <Button
            type="button"
            variant="outline"
            onClick={addCompletedTask}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Completed Task
          </Button>
        </CardContent>
      </Card>

      {/* Section 2: Tasks Pending */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl">⏳</span>
            Tasks Still Pending
          </CardTitle>
          <CardDescription>
            Add tasks you couldn&apos;t complete and explain why
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tasksPending.map((task) => (
            <div key={task.id} className="p-4 border rounded-lg space-y-3 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
              <div className="flex gap-2 items-start">
                <div className="flex-1 space-y-3">
                  <Input
                    placeholder="Task title *"
                    value={task.title}
                    onChange={(e) => updatePendingTask(task.id, { title: e.target.value })}
                    className="font-medium"
                  />
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder="Task link (Linear, Jira, etc.)"
                      value={task.task_link}
                      onChange={(e) => updatePendingTask(task.id, { task_link: e.target.value })}
                      className="flex-1"
                    />
                    {task.task_link && (
                      <a
                        href={task.task_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 p-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removePendingTask(task.id)}
                  className="h-8 w-8 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <Input
                placeholder="Why is this pending?"
                value={task.notes}
                onChange={(e) => updatePendingTask(task.id, { notes: e.target.value })}
              />

              {/* Blocker per task */}
              <div className="pt-2 border-t border-amber-200 dark:border-amber-900 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`blocked-${task.id}`}
                    checked={task.is_blocked || false}
                    onChange={(e) => updatePendingTask(task.id, { is_blocked: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor={`blocked-${task.id}`} className="text-sm cursor-pointer text-red-600 font-medium">
                    🚧 This task is blocked
                  </Label>
                </div>
                {task.is_blocked && (
                  <Textarea
                    placeholder="Describe the blocker - What's stopping progress?"
                    value={task.blocker_description || ''}
                    onChange={(e) => updatePendingTask(task.id, { blocker_description: e.target.value })}
                    rows={2}
                    className="border-red-300"
                  />
                )}
              </div>
            </div>
          ))}

          {/* Add task button */}
          <Button
            type="button"
            variant="outline"
            onClick={addPendingTask}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Pending Task
          </Button>
        </CardContent>
      </Card>

      {/* Section 3: Notes for Lead */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl">📝</span>
            Notes for Lead
          </CardTitle>
          <CardDescription>
            Anything else you want to share? (optional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notesForLead}
            onChange={(e) => setNotesForLead(e.target.value)}
            placeholder="Questions, concerns, suggestions, or anything else..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Section 4: Mood */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl">💭</span>
            How are you feeling today?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center gap-4">
            {moods.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMood(m.value)}
                className={`flex flex-col items-center p-3 rounded-lg transition-colors ${
                  mood === m.value
                    ? 'bg-primary/10 ring-2 ring-primary'
                    : 'hover:bg-muted'
                }`}
              >
                <span className="text-3xl">{m.emoji}</span>
                <span className="text-xs mt-1 text-muted-foreground">{m.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard')}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Check-in'}
        </Button>
      </div>
    </form>
  )
}
