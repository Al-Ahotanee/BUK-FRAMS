import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const courses = await db.course.findMany({
      include: {
        faculty: true,
        _count: {
          select: { units: true, students: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ status: 'success', data: courses });
  } catch (error) {
    console.error('Error fetching courses:', error);
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
    const { name, courseCode, facultyId } = body;

    if (!name || !courseCode || !facultyId) {
      return NextResponse.json(
        { status: 'error', message: 'Name, Course Code, and Faculty are required' },
        { status: 400 }
      );
    }

    const cleanCode = String(courseCode).trim().toUpperCase();

    const existing = await db.course.findUnique({
      where: { courseCode: cleanCode },
    });

    if (existing) {
      return NextResponse.json(
        { status: 'error', message: 'Programme code already exists' },
        { status: 400 }
      );
    }

    const created = await db.course.create({
      data: {
        name: String(name).trim(),
        courseCode: cleanCode,
        facultyId: Number(facultyId),
      },
    });

    return NextResponse.json({ status: 'success', data: created });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to create programme' }, { status: 500 });
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

    await db.course.delete({ where: { id } });
    return NextResponse.json({ status: 'success', message: 'Programme deleted' });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to delete programme' }, { status: 500 });
  }
}
