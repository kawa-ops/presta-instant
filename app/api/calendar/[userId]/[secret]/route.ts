import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { timingSafeEqual } from 'crypto'

// Public ICS feed, authenticated by the per-user secret token (calendar
// clients can't send cookies). Admins get every production; freelancers
// only their own. Hand-built ICS — no dependency.

export const dynamic = 'force-dynamic'
const db = prisma as any

function icsDate(d: Date) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}
function esc(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}
function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a); const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

export async function GET(_: Request, { params }: { params: { userId: string; secret: string } }) {
  try {
    const user = await db.user.findUnique({ where: { id: params.userId }, select: { id: true, role: true, calendarToken: true } }).catch(() => null)
    if (!user?.calendarToken || !safeEqual(user.calendarToken, params.secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const where: any = { archived: false }
    if (user.role !== 'admin') where.assignedToId = user.id
    const prods = await db.production.findMany({
      where,
      select: { id: true, title: true, client: true, status: true, deadline: true, productionDate: true, assignedTo: { select: { name: true } } },
      orderBy: { deadline: 'asc' },
    })

    const now = new Date()
    const stamp = `${icsDate(now)}T000000Z`
    const events: string[] = []
    for (const p of prods) {
      const who = p.assignedTo?.name ? ` — ${p.assignedTo.name}` : ''
      if (p.deadline) {
        const d = new Date(p.deadline)
        const end = new Date(d); end.setDate(end.getDate() + 1)
        events.push([
          'BEGIN:VEVENT',
          `UID:deadline-${p.id}@presta.instantmov.fr`,
          `DTSTAMP:${stamp}`,
          `DTSTART;VALUE=DATE:${icsDate(d)}`,
          `DTEND;VALUE=DATE:${icsDate(end)}`,
          `SUMMARY:${esc(`🎬 Deadline : ${p.title} (${p.client})${who}`)}`,
          `DESCRIPTION:${esc(`Statut : ${p.status}`)}`,
          'END:VEVENT',
        ].join('\r\n'))
      }
      if (p.productionDate) {
        const d = new Date(p.productionDate)
        const end = new Date(d); end.setDate(end.getDate() + 1)
        events.push([
          'BEGIN:VEVENT',
          `UID:prod-${p.id}@presta.instantmov.fr`,
          `DTSTAMP:${stamp}`,
          `DTSTART;VALUE=DATE:${icsDate(d)}`,
          `DTEND;VALUE=DATE:${icsDate(end)}`,
          `SUMMARY:${esc(`📹 Tournage : ${p.title} (${p.client})${who}`)}`,
          'END:VEVENT',
        ].join('\r\n'))
      }
    }

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//instant.//presta-instant//FR',
      'CALSCALE:GREGORIAN',
      'X-WR-CALNAME:instant. — productions',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n')

    return new NextResponse(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="instant-productions.ics"',
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
