import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const unitCode = searchParams.get('unitCode');

    if (!unitCode) {
      return NextResponse.json({ status: 'error', message: 'Unit code required' }, { status: 400 });
    }

    // Get all students enrolled in unit
    const unit = await db.unit.findUnique({
      where: { unitCode },
      include: {
        studentAssignments: {
          include: { student: true },
        },
      },
    });

    if (!unit) {
      return NextResponse.json({ status: 'error', message: 'Unit not found' }, { status: 404 });
    }

    // Calculate total sessions held for this unit
    const distinctDates = await db.attendance.groupBy({
      by: ['dateMarked'],
      where: { unitCode },
    });
    const totalSessions = Math.max(distinctDates.length, 1);

    const defaulters = [];

    for (const sa of unit.studentAssignments) {
      const presentCount = await db.attendance.count({
        where: {
          studentRegistrationNumber: sa.student.registrationNumber,
          unitCode,
          attendanceStatus: 'Present',
        },
      });

      const percentage = Math.round((presentCount / totalSessions) * 100);

      if (percentage < 70) {
        defaulters.push({
          id: sa.student.id,
          name: `${sa.student.firstName} ${sa.student.lastName}`,
          registrationNumber: sa.student.registrationNumber,
          email: sa.student.email,
          totalSessions,
          presentCount,
          percentage,
        });
      }
    }

    return NextResponse.json({
      status: 'success',
      totalSessions,
      defaulters,
    });
  } catch (error) {
    console.error('Error fetching defaulters:', error);
    return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = getSession();
  if (!session || session.role !== 'lecturer') {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { unitCode, students } = body;

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ status: 'error', message: 'No students selected' }, { status: 400 });
    }

    let sentCount = 0;
    for (const s of students) {
      await db.notificationLog.create({
        data: {
          recipient: s.email,
          subject: `URGENT: BUK Attendance Warning for ${unitCode}`,
          message: `Dear ${s.name} (${s.registrationNumber}), your attendance in ${unitCode} currently stands at ${s.percentage}%, which is below the mandatory 70% threshold required by Bayero University Kano. You risk being barred from the semester examination if your attendance is not rectified immediately.`,
          status: 'sent',
        },
      });
      sentCount++;
    }

    return NextResponse.json({
      status: 'success',
      message: `Dispatched official attendance warnings to ${sentCount} student(s)`,
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to send notifications' }, { status: 500 });
  }
}
