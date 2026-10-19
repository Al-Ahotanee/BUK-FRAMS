import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const lecturers = await db.lecturer.findMany({
      include: {
        faculty: true,
        unitAssignments: {
          include: { unit: true },
        },
      },
      orderBy: { firstName: 'asc' },
    });
    return NextResponse.json({ status: 'success', data: lecturers });
  } catch (error) {
    console.error('Error fetching lecturers:', error);
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
    const { firstName, lastName, email, password, phoneNo, facultyId } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { status: 'error', message: 'First name, last name, and email are required' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const existing = await db.lecturer.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { status: 'error', message: 'Lecturer with this email already exists' },
        { status: 400 }
      );
    }

    let facultyCode = null;
    if (facultyId) {
      const fac = await db.faculty.findUnique({ where: { id: Number(facultyId) } });
      if (fac) facultyCode = fac.facultyCode;
    }

    const hashedPassword = await bcrypt.hash(password || '@lecturer_', 10);

    const created = await db.lecturer.create({
      data: {
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: cleanEmail,
        password: hashedPassword,
        phoneNo: phoneNo ? String(phoneNo).trim() : null,
        facultyId: facultyId ? Number(facultyId) : null,
        facultyCode,
      },
    });

    return NextResponse.json({ status: 'success', data: created });
  } catch (error) {
    console.error('Error creating lecturer:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to create lecturer' }, { status: 500 });
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

    await db.lecturer.delete({ where: { id } });
    return NextResponse.json({ status: 'success', message: 'Lecturer deleted' });
  } catch (error) {
    console.error('Error deleting lecturer:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to delete lecturer' }, { status: 500 });
  }
}
