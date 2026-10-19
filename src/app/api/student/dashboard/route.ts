import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = getSession();
    if (!session || session.role !== 'student') {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const student = await db.student.findUnique({
      where: { id: session.id },
      include: {
        unitAssignments: {
          include: {
            unit: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ status: 'error', message: 'Student not found' }, { status: 404 });
    }

    // Fetch student's attendance records
    const attendances = await db.attendance.findMany({
      where: { studentRegistrationNumber: student.registrationNumber },
      orderBy: { dateMarked: 'desc' },
      take: 20,
      include: {
        unit: true,
      },
    });

    // Calculate attendance statistics across registered units
    const unitIds = student.unitAssignments.map((ua) => ua.unitId);

    // Total lectures held in these units (distinct dates marked in attendance table for these units)
    const unitLectures = await db.attendance.findMany({
      where: {
        unitId: { in: unitIds },
      },
      select: {
        unitId: true,
        dateMarked: true,
      },
    });

    // Approximate total lecture sessions conducted
    const totalLecturesConducted = Math.max(unitLectures.length, 1);
    const attendedCount = attendances.filter((a) => a.attendanceStatus === 'Present' || a.attendanceStatus === 'Excused').length;
    const percentage = Math.round((attendedCount / Math.max(attendances.length, 1)) * 100);

    // Count pending excuses
    const pendingExcusesCount = await db.absenceExcuse.count({
      where: {
        studentId: student.id,
        status: 'PENDING',
      },
    });

    const isEligibleForExams = percentage >= 70; // BUK Official Regulation

    return NextResponse.json({
      status: 'success',
      student: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        registrationNumber: student.registrationNumber,
        email: student.email,
        faculty: student.faculty,
        courseCode: student.courseCode,
        studentImage: student.studentImage,
      },
      metrics: {
        totalCourses: student.unitAssignments.length,
        totalClassesAttended: attendedCount,
        totalClassesMissed: Math.max(0, attendances.length - attendedCount),
        attendanceRate: percentage,
        isEligibleForExams,
        pendingExcusesCount,
      },
      recentAttendance: attendances.slice(0, 5),
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
  }
}
