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
                lecturerAssignments: {
                  include: {
                    lecturer: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ status: 'error', message: 'Student not found' }, { status: 404 });
    }

    // For each assigned unit, compute attendance records
    const coursesData = await Promise.all(
      student.unitAssignments.map(async (ua) => {
        const unit = ua.unit;
        const totalUnitAttendances = await db.attendance.findMany({
          where: {
            unitId: unit.id,
            studentRegistrationNumber: student.registrationNumber,
          },
        });

        const attended = totalUnitAttendances.filter(
          (a) => a.attendanceStatus === 'Present' || a.attendanceStatus === 'Excused'
        ).length;
        const total = Math.max(totalUnitAttendances.length, 1);
        const percentage = Math.round((attended / total) * 100);

        const lecturer = unit.lecturerAssignments[0]?.lecturer;

        return {
          unitId: unit.id,
          unitName: unit.name,
          unitCode: unit.unitCode,
          programme: unit.course.name,
          programmeCode: unit.course.courseCode,
          lecturerName: lecturer ? `${lecturer.firstName} ${lecturer.lastName}` : 'Assigned Lecturer',
          lecturerEmail: lecturer?.email || 'N/A',
          totalLectures: totalUnitAttendances.length,
          classesAttended: attended,
          attendanceRate: percentage,
          isEligible: percentage >= 70, // BUK 70% requirement
        };
      })
    );

    return NextResponse.json({
      status: 'success',
      courses: coursesData,
    });
  } catch (error) {
    console.error('Student courses error:', error);
    return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
  }
}
