import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ briefings: [] })
}

export async function POST() {
  return NextResponse.json({ message: 'Created' })
}
