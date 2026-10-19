import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const venues = await db.venue.findMany({
      include: {
        faculty: true,
      },
      orderBy: { className: 'asc' },
    });
    return NextResponse.json({ status: 'success', data: venues });
  } catch (error) {
    console.error('Error fetching venues:', error);
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
    const { className, facultyId, capacity, classification, currentStatus } = body;

    if (!className) {
      return NextResponse.json(
        { status: 'error', message: 'Venue Name is required' },
        { status: 400 }
      );
    }

    const cleanName = String(className).trim();

    const existing = await db.venue.findUnique({
      where: { className: cleanName },
    });

    if (existing) {
      return NextResponse.json(
        { status: 'error', message: 'Venue already exists' },
        { status: 400 }
      );
    }

    let facultyCode = null;
    if (facultyId) {
      const fac = await db.faculty.findUnique({ where: { id: Number(facultyId) } });
      if (fac) facultyCode = fac.facultyCode;
    }

    const created = await db.venue.create({
      data: {
        className: cleanName,
        facultyId: facultyId ? Number(facultyId) : null,
        facultyCode,
        capacity: Number(capacity) || 50,
        classification: classification || 'Lecture Theatre',
        currentStatus: currentStatus || 'available',
      },
    });

    return NextResponse.json({ status: 'success', data: created });
  } catch (error) {
    console.error('Error creating venue:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to create venue' }, { status: 500 });
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

    await db.venue.delete({ where: { id } });
    return NextResponse.json({ status: 'success', message: 'Venue deleted' });
  } catch (error) {
    console.error('Error deleting venue:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to delete venue' }, { status: 500 });
  }
}
