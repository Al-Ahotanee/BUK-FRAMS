import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET: List all absence excuse requests for admin review
export async function GET(request: Request) {
  try {
    const session = getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'lecturer')) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const whereClause: { status?: string } = {};
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const excuses = await db.absenceExcuse.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            registrationNumber: true,
            email: true,
            faculty: true,
            courseCode: true,
            studentImage: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
            unitCode: true,
          },
        },
      },
    });

    return NextResponse.json({
      status: 'success',
      excuses,
    });
  } catch (error) {
    console.error('Admin excuses GET error:', error);
    return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Approve or Reject excuse request
export async function PATCH(request: Request) {
  try {
    const session = getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'lecturer')) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, adminNotes } = body;

    if (!id || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ status: 'error', message: 'Valid excuse ID and status (APPROVED or REJECTED) are required' }, { status: 400 });
    }

    const excuse = await db.absenceExcuse.update({
      where: { id: Number(id) },
      data: {
        status,
        adminNotes: adminNotes || null,
        reviewedBy: session.email,
      },
      include: {
        student: true,
        unit: true,
      },
    });

    // If APPROVED, ensure an attendance record with status "Excused" is created/marked
    if (status === 'APPROVED') {
      await db.attendance.create({
        data: {
          studentRegistrationNumber: excuse.student.registrationNumber,
          studentId: excuse.student.id,
          courseCode: excuse.student.courseCode,
          unitCode: excuse.unit.unitCode,
          unitId: excuse.unit.id,
          venue: 'Waiver Granted',
          attendanceStatus: 'Excused',
          timeMarked: 'OFFICIAL_WAIVER',
          dateMarked: excuse.dateMissed,
        },
      });
    }

    await logAuditEvent({
      actorRole: session.role === 'admin' ? 'ADMIN' : 'LECTURER',
      actorEmail: session.email,
      action: status === 'APPROVED' ? 'EXCUSE_APPROVED' : 'EXCUSE_REJECTED',
      details: `${session.name} ${status.toLowerCase()} absence excuse for ${excuse.student.registrationNumber} in ${excuse.unit.unitCode}`,
    });

    return NextResponse.json({
      status: 'success',
      message: `Excuse request ${status.toLowerCase()} successfully`,
      excuse,
    });
  } catch (error) {
    console.error('Admin excuse update error:', error);
    return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
  }
}
