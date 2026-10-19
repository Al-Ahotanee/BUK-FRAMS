import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const students = await db.student.findMany({
      include: {
        course: { include: { faculty: true } },
        unitAssignments: { include: { unit: true } },
        _count: { select: { attendances: true } },
      },
      orderBy: { registrationNumber: 'asc' },
    });
    return NextResponse.json({ status: 'success', data: students });
  } catch (error) {
    console.error('Error fetching students:', error);
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
    const {
      firstName,
      lastName,
      registrationNumber,
      email,
      faculty,
      courseCode,
      courseId,
      studentImage,
      faceDescriptors,
    } = body;

    if (!firstName || !lastName || !registrationNumber || !email) {
      return NextResponse.json(
        { status: 'error', message: 'First name, last name, registration number, and email are required' },
        { status: 400 }
      );
    }

    const cleanRegNo = String(registrationNumber).trim().toUpperCase();
    const cleanEmail = String(email).trim().toLowerCase();

    const existingReg = await db.student.findUnique({
      where: { registrationNumber: cleanRegNo },
    });

    if (existingReg) {
      return NextResponse.json(
        { status: 'error', message: `Student with Reg No: ${cleanRegNo} already exists` },
        { status: 400 }
      );
    }

    const created = await db.student.create({
      data: {
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        registrationNumber: cleanRegNo,
        email: cleanEmail,
        faculty: faculty || 'FCSIT',
        courseCode: courseCode || 'B.Sc. CSC',
        courseId: courseId ? Number(courseId) : null,
        studentImage: studentImage || null,
        faceDescriptors: faceDescriptors ? JSON.stringify(faceDescriptors) : null,
      },
    });

    return NextResponse.json({ status: 'success', data: created });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to create student' }, { status: 500 });
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

    await db.student.delete({ where: { id } });
    return NextResponse.json({ status: 'success', message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to delete student' }, { status: 500 });
  }
}
