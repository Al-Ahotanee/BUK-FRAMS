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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const whereClause: Record<string, any> = {};

    if (unitCode) {
      whereClause.unitCode = unitCode;
    }

    if (startDate && endDate) {
      whereClause.dateMarked = {
        gte: new Date(startDate),
        lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    }

    const records = await db.attendance.findMany({
      where: whereClause,
      include: {
        student: true,
        unit: true,
      },
      orderBy: { dateMarked: 'desc' },
      take: 200,
    });

    return NextResponse.json({ status: 'success', data: records });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ status: 'error', message: 'Database error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = getSession();
  if (!session || session.role !== 'lecturer') {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { unitCode, courseCode, venue, records } = body;

    if (!unitCode || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { status: 'error', message: 'Unit code and attendance records are required' },
        { status: 400 }
      );
    }

    const unit = await db.unit.findUnique({
      where: { unitCode },
      include: { course: true },
    });

    const cCode = courseCode || unit?.course?.courseCode || 'GENERAL';
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    let insertedCount = 0;

    for (const item of records) {
      if (!item.studentRegistrationNumber) continue;

      const regNo = String(item.studentRegistrationNumber).trim();
      const student = await db.student.findUnique({
        where: { registrationNumber: regNo },
      });

      // Check if already marked for today
      const existing = await db.attendance.findFirst({
        where: {
          studentRegistrationNumber: regNo,
          unitCode,
          dateMarked: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      });

      if (existing) {
        // Update existing record
        await db.attendance.update({
          where: { id: existing.id },
          data: {
            attendanceStatus: item.status || 'Present',
            venue: venue || existing.venue,
            timeMarked: item.time || existing.timeMarked,
          },
        });
      } else {
        // Insert new record
        await db.attendance.create({
          data: {
            studentRegistrationNumber: regNo,
            studentId: student?.id || null,
            courseCode: cCode,
            unitCode,
            unitId: unit?.id || null,
            venue: venue || 'Classroom',
            attendanceStatus: item.status || 'Present',
            timeMarked: item.time || new Date().toLocaleTimeString(),
            dateMarked: today,
          },
        });
      }
      insertedCount++;
    }

    return NextResponse.json({
      status: 'success',
      message: `Successfully logged attendance for ${insertedCount} student(s)`,
    });
  } catch (error) {
    console.error('Error saving attendance batch:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to save attendance' }, { status: 500 });
  }
}
