import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = getSession();
    if (!session || session.role !== 'student') {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unitCode = searchParams.get('unitCode');

    const whereClause: { studentRegistrationNumber: string; unitCode?: string } = {
      studentRegistrationNumber: session.regNo || '',
    };

    if (unitCode) {
      whereClause.unitCode = unitCode;
    }

    const logs = await db.attendance.findMany({
      where: whereClause,
      orderBy: { dateMarked: 'desc' },
      include: {
        unit: true,
      },
    });

    return NextResponse.json({
      status: 'success',
      logs,
    });
  } catch (error) {
    console.error('Student attendance logs error:', error);
    return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
  }
}
