import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const faculties = await db.faculty.findMany({
      include: {
        _count: {
          select: { courses: true, lecturers: true, venues: true },
        },
      },
      orderBy: { facultyName: 'asc' },
    });
    return NextResponse.json({ status: 'success', data: faculties });
  } catch (error) {
    console.error('Error fetching faculties:', error);
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
    const { facultyName, facultyCode } = body;

    if (!facultyName || !facultyCode) {
      return NextResponse.json(
        { status: 'error', message: 'Faculty Name and Code are required' },
        { status: 400 }
      );
    }

    const cleanCode = String(facultyCode).trim().toUpperCase();
    const cleanName = String(facultyName).trim();

    const existing = await db.faculty.findUnique({
      where: { facultyCode: cleanCode },
    });

    if (existing) {
      return NextResponse.json(
        { status: 'error', message: 'Faculty Code already exists' },
        { status: 400 }
      );
    }

    const created = await db.faculty.create({
      data: {
        facultyName: cleanName,
        facultyCode: cleanCode,
      },
    });

    return NextResponse.json({ status: 'success', data: created });
  } catch (error) {
    console.error('Error creating faculty:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to create faculty' }, { status: 500 });
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

    await db.faculty.delete({ where: { id } });
    return NextResponse.json({ status: 'success', message: 'Faculty deleted' });
  } catch (error) {
    console.error('Error deleting faculty:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to delete faculty' }, { status: 500 });
  }
}
