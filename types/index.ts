export type UserRole = 'lead' | 'dev' | 'qa'
export type TaskStatus = 'active' | 'pending' | 'in_progress' | 'blocked' | 'in_qa' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  assignee_id: string | null
  created_by: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  task_link: string | null
  linear_id: string | null
  github_pr_url: string | null
  estimated_days: number | null
  pending_since: string | null
  blocked_since: string | null
  blocker_description: string | null
  qa_required: boolean
  qa_passed: boolean | null
  qa_checked_by: string | null
  qa_checked_at: string | null
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  assignee?: Profile
}

export interface CheckinTaskItem {
  task_id?: string
  title: string
  task_link?: string
  status: string
  notes?: string
  // For completed tasks
  qa_done?: boolean
  pr_submitted?: boolean
  pr_url?: string
  // For pending tasks
  is_blocked?: boolean
  blocker_description?: string
}

export interface Checkin {
  id: string
  user_id: string
  checkin_date: string
  tasks_completed: CheckinTaskItem[]
  tasks_pending: CheckinTaskItem[]
  has_blocker: boolean
  blocker_description: string | null
  blocker_task_id: string | null
  qa_checklist_done: boolean | null
  pr_submitted: boolean | null
  pr_urls: string[]
  notes_for_lead: string | null
  mood: number | null
  submitted_at: string
  created_at: string
  user?: Profile
}

export interface Briefing {
  id: string
  briefing_date: string
  content: string
  issues_found: boolean
  issues_summary: string[]
  checkin_count: number
  member_count: number
  missing_checkins: string[]
  generated_at: string
}

export interface DashboardStats {
  checkinsToday: number
  totalTeamMembers: number
  openBlockers: number
  qaQueue: number
  pendingTasks: number
  completedThisWeek: number
}
