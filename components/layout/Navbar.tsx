'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOut, Settings, User, Bell, ChevronDown } from 'lucide-react'

interface NavbarProps {
  user: {
    email: string
    full_name?: string | null
    avatar_url?: string | null
    role: string
  }
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter()
  const supabase = createClient()
  const [showMenu, setShowMenu] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getInitials = (name: string | null | undefined, email: string) => {
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'lead':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
      case 'qa':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      default:
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'lead':
        return 'Team Lead'
      case 'qa':
        return 'QA Engineer'
      default:
        return 'Developer'
    }
  }

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">T</span>
          </div>
          <span className="font-semibold text-lg">TeamPulse</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
            3
          </span>
        </Button>

        <div className="relative">
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-2"
            onClick={() => setShowMenu(!showMenu)}
          >
            <Avatar className="h-8 w-8">
              {user.avatar_url && <AvatarImage src={user.avatar_url} />}
              <AvatarFallback className="text-xs">
                {getInitials(user.full_name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-sm font-medium">
                {user.full_name || user.email.split('@')[0]}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadgeColor(user.role)}`}>
                {getRoleLabel(user.role)}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 hidden md:block" />
          </Button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-56 rounded-md border bg-popover p-1 shadow-md z-50">
                <div className="px-2 py-1.5 text-sm font-semibold">
                  <div>{user.full_name || 'User'}</div>
                  <div className="text-xs font-normal text-muted-foreground">{user.email}</div>
                </div>
                <div className="h-px bg-muted my-1" />
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={() => {
                    setShowMenu(false)
                    router.push('/dashboard/profile')
                  }}
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={() => {
                    setShowMenu(false)
                    router.push('/dashboard/settings')
                  }}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <div className="h-px bg-muted my-1" />
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
