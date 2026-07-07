import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
const db = prisma as any

// List custom achievements (any logged-in user, needed for badge display)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const rows = await db.customAchievement.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Create a new achievement (admin only) — becomes part of the system instantly
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { emoji, label, description, xp } = await req.json()
  if (!emoji?.trim() || !label?.trim()) return NextResponse.json({ error: 'Emoji et nom requis' }, { status: 400 })

  try {
    const row = await db.customAchievement.create({
      data: {
        emoji: emoji.trim().slice(0, 8),
        label: label.trim().slice(0, 80),
        description: description?.trim()?.slice(0, 200) || null,
        xp: Math.max(0, Math.min(parseInt(xp) || 25, 500)),
      },
    })
    return NextResponse.json(row, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
