import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = getSession();
  if (!session || session.role !== 'lecturer') {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [assignments, venues] = await Promise.all([
      db.lecturerUnit.findMany({
        where: { lecturerId: session.id },
        include: {
          unit: {
            include: {
              course: true,
              _count: {
                select: { studentAssignments: true },
              },
            },
          },
        },
      }),
      db.venue.findMany({
        where: { currentStatus: 'available' },
        orderBy: { className: 'asc' },
      }),
    ]);

    const units = assignments.map((a) => ({
      id: a.unit.id,
      unitCode: a.unit.unitCode,
      name: a.unit.name,
      courseCode: a.unit.course.courseCode,
      courseName: a.unit.course.name,
      enrolledStudents: a.unit._count.studentAssignments,
    }));

    return NextResponse.json({
      status: 'success',
      data: {
        units,
        venues,
      },
    });
  } catch (error) {
    console.error('Error fetching lecturer courses:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to load courses' }, { status: 500 });
  }
}
