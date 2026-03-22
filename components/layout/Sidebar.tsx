'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ClipboardCheck,
  ListTodo,
  Users,
  FileText,
  Settings,
  HelpCircle,
  CheckSquare,
} from 'lucide-react'

interface SidebarProps {
  role: string
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['lead', 'qa', 'dev'],
    },
    {
      label: 'EOD Check-in',
      href: '/dashboard/checkin',
      icon: ClipboardCheck,
      roles: ['dev', 'qa'],
    },
    {
      label: 'Tasks',
      href: '/dashboard/tasks',
      icon: ListTodo,
      roles: ['lead', 'qa', 'dev'],
    },
    {
      label: 'QA Queue',
      href: '/dashboard/qa',
      icon: CheckSquare,
      roles: ['lead', 'qa'],
    },
    {
      label: 'Team',
      href: '/dashboard/team',
      icon: Users,
      roles: ['lead'],
    },
    {
      label: 'Briefings',
      href: '/dashboard/briefings',
      icon: FileText,
      roles: ['lead'],
    },
  ]

  const bottomItems = [
    {
      label: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      roles: ['lead', 'qa', 'dev'],
    },
    {
      label: 'Help',
      href: '/dashboard/help',
      icon: HelpCircle,
      roles: ['lead', 'qa', 'dev'],
    },
  ]

  const filteredNavItems = navItems.filter((item) => item.roles.includes(role))
  const filteredBottomItems = bottomItems.filter((item) => item.roles.includes(role))

  return (
    <aside className="w-64 border-r bg-card flex flex-col">
      <nav className="flex-1 p-4 space-y-1">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t space-y-1">
        {filteredBottomItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
