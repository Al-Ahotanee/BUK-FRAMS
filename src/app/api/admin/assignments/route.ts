import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, unitId, lecturerId, studentIds } = body;

    if (!unitId) {
      return NextResponse.json({ status: 'error', message: 'Unit ID is required' }, { status: 400 });
    }

    if (type === 'lecturer') {
      if (!lecturerId) {
        return NextResponse.json({ status: 'error', message: 'Lecturer ID is required' }, { status: 400 });
      }

      const existing = await db.lecturerUnit.findUnique({
        where: {
          lecturerId_unitId: {
            lecturerId: Number(lecturerId),
            unitId: Number(unitId),
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { status: 'warning', message: 'Lecturer is already assigned to this unit' }
        );
      }

      await db.lecturerUnit.create({
        data: {
          lecturerId: Number(lecturerId),
          unitId: Number(unitId),
        },
      });

      return NextResponse.json({ status: 'success', message: 'Unit assigned to lecturer' });
    } else if (type === 'students') {
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return NextResponse.json({ status: 'error', message: 'Select at least one student' }, { status: 400 });
      }

      let count = 0;
      for (const studentId of studentIds) {
        try {
          await db.studentUnit.upsert({
            where: {
              studentId_unitId: {
                studentId: Number(studentId),
                unitId: Number(unitId),
              },
            },
            update: {},
            create: {
              studentId: Number(studentId),
              unitId: Number(unitId),
            },
          });
          count++;
        } catch (e) {
          console.warn('Assignment skip:', e);
        }
      }

      return NextResponse.json({
        status: 'success',
        message: `Successfully enrolled ${count} student(s) into this unit`,
      });
    }

    return NextResponse.json({ status: 'error', message: 'Invalid assignment type' }, { status: 400 });
  } catch (error) {
    console.error('Error in assignments:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to process assignment' }, { status: 500 });
  }
}
