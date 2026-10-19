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
      return NextResponse.json({ status: 'error', message: 'Unit Code is required' }, { status: 400 });
    }

    const unit = await db.unit.findUnique({
      where: { unitCode: String(unitCode).trim() },
      include: {
        studentAssignments: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!unit) {
      return NextResponse.json({ status: 'error', message: 'Unit not found' }, { status: 404 });
    }

    const students = unit.studentAssignments.map((sa) => {
      let descriptors = null;
      if (sa.student.faceDescriptors) {
        try {
          descriptors = JSON.parse(sa.student.faceDescriptors);
        } catch {
          descriptors = null;
        }
      }

      return {
        id: sa.student.id,
        firstName: sa.student.firstName,
        lastName: sa.student.lastName,
        name: `${sa.student.firstName} ${sa.student.lastName}`,
        registrationNumber: sa.student.registrationNumber,
        email: sa.student.email,
        studentImage: sa.student.studentImage,
        faceDescriptors: descriptors,
        hasFaceEnrolled: Boolean(descriptors && descriptors.length > 0),
      };
    });

    return NextResponse.json({
      status: 'success',
      unit: {
        id: unit.id,
        name: unit.name,
        unitCode: unit.unitCode,
      },
      data: students,
    });
  } catch (error) {
    console.error('Error fetching unit students:', error);
    return NextResponse.json({ status: 'error', message: 'Database error' }, { status: 500 });
  }
}
