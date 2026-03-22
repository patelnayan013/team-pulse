import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEODSummary } from '@/lib/telegram'
import type { Checkin, Profile } from '@/types'

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

  // Check Telegram configuration
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    return NextResponse.json(
      { error: 'Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.' },
      { status: 500 }
    )
  }

  const supabase = getSupabaseAdmin()

  // Use query param ?date=today for testing, otherwise use targetDate
  const dateParam = request.nextUrl.searchParams.get('date')
  const targetDate = dateParam === 'today'
    ? new Date().toISOString().split('T')[0]
    : new Date(Date.now() - 86400000).toISOString().split('T')[0]

  try {
    // Get all active members
    const { data: members, error: membersError } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)

    if (membersError) {
      throw new Error(`Failed to fetch members: ${membersError.message}`)
    }

    // Get targetDate's check-ins with user data
    const { data: checkins, error: checkinsError } = await supabase
      .from('checkins')
      .select('*, user:profiles(*)')
      .eq('checkin_date', targetDate)

    if (checkinsError) {
      throw new Error(`Failed to fetch checkins: ${checkinsError.message}`)
    }

    // Send Telegram summary
    const success = await sendEODSummary(
      (checkins || []) as (Checkin & { user: Profile })[],
      (members || []) as Profile[],
      targetDate
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to send Telegram message' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      date: targetDate,
      checkins_count: checkins?.length || 0,
      members_count: members?.length || 0,
      // Debug data
      debug: {
        checkins: checkins,
        members: members,
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Failed to send EOD Telegram summary:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
