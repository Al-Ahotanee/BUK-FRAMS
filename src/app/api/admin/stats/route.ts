import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [
      studentsCount,
      lecturersCount,
      unitsCount,
      coursesCount,
      venuesCount,
      totalAttendanceCount,
      presentAttendanceCount,
      recentAttendances,
    ] = await Promise.all([
      db.student.count(),
      db.lecturer.count(),
      db.unit.count(),
      db.course.count(),
      db.venue.count(),
      db.attendance.count(),
      db.attendance.count({ where: { attendanceStatus: 'Present' } }),
      db.attendance.findMany({
        take: 7,
        orderBy: { dateMarked: 'desc' },
        include: {
          student: true,
          unit: true,
        },
      }),
    ]);

    const attendanceRate = totalAttendanceCount > 0
      ? Math.round((presentAttendanceCount / totalAttendanceCount) * 100)
      : 100;

    return NextResponse.json({
      status: 'success',
      data: {
        students: studentsCount,
        lecturers: lecturersCount,
        units: unitsCount,
        courses: coursesCount,
        venues: venuesCount,
        attendanceRate,
        totalRecords: totalAttendanceCount,
        recentAttendances,
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to fetch statistics' }, { status: 500 });
  }
}
