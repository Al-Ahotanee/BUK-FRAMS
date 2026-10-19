import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const units = await db.unit.findMany({
      include: {
        course: {
          include: { faculty: true },
        },
        _count: {
          select: { studentAssignments: true, lecturerAssignments: true, attendances: true },
        },
      },
      orderBy: { unitCode: 'asc' },
    });
    return NextResponse.json({ status: 'success', data: units });
  } catch (error) {
    console.error('Error fetching units:', error);
    return NextResponse.json({ status: 'error', message: 'Database error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, unitCode, courseId } = body;

    if (!name || !unitCode || !courseId) {
      return NextResponse.json(
        { status: 'error', message: 'Unit Name, Unit Code, and Programme are required' },
        { status: 400 }
      );
    }

    const cleanCode = String(unitCode).trim().toUpperCase();

    const existing = await db.unit.findUnique({
      where: { unitCode: cleanCode },
    });

    if (existing) {
      return NextResponse.json(
        { status: 'error', message: 'Unit code already exists' },
        { status: 400 }
      );
    }

    const created = await db.unit.create({
      data: {
        name: String(name).trim(),
        unitCode: cleanCode,
        courseId: Number(courseId),
      },
    });

    return NextResponse.json({ status: 'success', data: created });
  } catch (error) {
    console.error('Error creating unit:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to create unit' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));

    if (!id) {
      return NextResponse.json({ status: 'error', message: 'Invalid ID' }, { status: 400 });
    }

    await db.unit.delete({ where: { id } });
    return NextResponse.json({ status: 'success', message: 'Unit deleted' });
  } catch (error) {
    console.error('Error deleting unit:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to delete unit' }, { status: 500 });
  }
}
