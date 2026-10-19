import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const limit = Number(searchParams.get('limit')) || 50;

    const whereClause: { actorRole?: string } = {};
    if (role && role !== 'ALL') {
      whereClause.actorRole = role;
    }

    const logs = await db.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      status: 'success',
      logs,
    });
  } catch (error) {
    console.error('Audit logs GET error:', error);
    return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
  }
}
