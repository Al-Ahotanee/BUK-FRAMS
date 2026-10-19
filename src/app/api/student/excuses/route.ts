import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET: List all absence excuses for current student
export async function GET() {
  try {
    const session = getSession();
    if (!session || session.role !== 'student') {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const excuses = await db.absenceExcuse.findMany({
      where: { studentId: session.id },
      orderBy: { createdAt: 'desc' },
      include: {
        unit: {
          include: {
            course: true,
          },
        },
      },
    });

    return NextResponse.json({
      status: 'success',
      excuses,
    });
  } catch (error) {
    console.error('Student excuses GET error:', error);
    return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
  }
}

// POST: Submit a new absence excuse / waiver request
export async function POST(request: Request) {
  try {
    const session = getSession();
    if (!session || session.role !== 'student') {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { unitId, reason, description, documentUrl, dateMissed } = body;

    if (!unitId || !reason || !description || !dateMissed) {
      return NextResponse.json(
        { status: 'error', message: 'Unit, reason category, description, and date missed are required.' },
        { status: 400 }
      );
    }

    const excuse = await db.absenceExcuse.create({
      data: {
        studentId: session.id,
        unitId: Number(unitId),
        reason,
        description,
        documentUrl: documentUrl || null,
        dateMissed: new Date(dateMissed),
        status: 'PENDING',
      },
      include: {
        unit: true,
      },
    });

    await logAuditEvent({
      actorRole: 'STUDENT',
      actorEmail: session.email,
      action: 'EXCUSE_SUBMITTED',
      details: `Student ${session.regNo} submitted an absence waiver for unit ${excuse.unit.unitCode} (${reason})`,
    });

    return NextResponse.json({
      status: 'success',
      message: 'Absence excuse request submitted successfully. It is now awaiting review.',
      excuse,
    });
  } catch (error) {
    console.error('Student excuse submission error:', error);
    return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
  }
}
