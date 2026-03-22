import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ invitations: [] })
}

export async function POST() {
  return NextResponse.json({ message: 'Created' })
}
