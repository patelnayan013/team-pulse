import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateDailyBriefing } from '@/lib/anthropic'
import type { Checkin, Profile, Task } from '@/types'

// Lazy initialization to avoid build errors when env vars are not set
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  // Protect cron endpoint with secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Initialize Supabase admin client
  const supabase = getSupabaseAdmin()

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  try {
    // Get all active members (profiles)
    const { data: members } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)

    // Get yesterday's check-ins with user data
    const { data: checkins } = await supabase
      .from('checkins')
      .select('*, user:profiles(*)')
      .eq('checkin_date', yesterday)

    // Get open blockers
    const { data: openBlockers } = await supabase
      .from('tasks')
      .select('*, assignee:profiles(*)')
      .eq('status', 'blocked')

    // Get tasks pending 2+ days
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]
    const { data: pendingTasks } = await supabase
      .from('tasks')
      .select('*, assignee:profiles(*)')
      .eq('status', 'pending')
      .lte('pending_since', twoDaysAgo)

    // Get QA queue
    const { data: qaQueue } = await supabase
      .from('tasks')
      .select('*, assignee:profiles(*)')
      .eq('status', 'in_qa')

    // Generate AI briefing
    const briefingContent = await generateDailyBriefing({
      date: today,
      checkins: (checkins || []) as (Checkin & { user: Profile })[],
      allMembers: (members || []) as Profile[],
      openBlockers: (openBlockers || []) as Task[],
      pendingTasks: (pendingTasks || []) as Task[],
      qaQueue: (qaQueue || []) as Task[],
    })

    const missingCheckins = ((members || []) as Profile[])
      .filter((m) => m.role !== 'lead')
      .filter((m) => !((checkins || []) as Checkin[]).find((c) => c.user_id === m.id))
      .map((m) => m.full_name || m.email)

    const issuesFound =
      (openBlockers?.length ?? 0) > 0 ||
      (pendingTasks?.length ?? 0) > 0 ||
      missingCheckins.length > 0

    // Save briefing to DB
    await supabase.from('briefings').upsert(
      {
        briefing_date: today,
        content: briefingContent,
        issues_found: issuesFound,
        issues_summary: [],
        checkin_count: checkins?.length || 0,
        member_count: ((members || []) as Profile[]).filter((m) => m.role !== 'lead').length,
        missing_checkins: missingCheckins,
      },
      {
        onConflict: 'briefing_date',
      }
    )

    return NextResponse.json({
      success: true,
      date: today,
      checkins_processed: checkins?.length || 0,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Failed to generate briefing:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
