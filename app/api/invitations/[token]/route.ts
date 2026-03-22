import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ invitation: null })
}

export async function POST() {
  return NextResponse.json({ message: 'Accepted' })
}
