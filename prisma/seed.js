const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Bayero University Kano (BUK) Attendance Database...');

  // 1. Create Default Admin
  const adminPassword = await bcrypt.hash('@admin_', 10);
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@buk.edu.ng' },
    update: { password: adminPassword },
    create: {
      firstName: 'BUK',
      lastName: 'Administrator',
      email: 'admin@buk.edu.ng',
      password: adminPassword,
    },
  });
  console.log(`Admin account initialized: ${admin.email}`);

  // 2. Create BUK Faculties
  const fcsit = await prisma.faculty.upsert({
    where: { facultyCode: 'FCSIT' },
    update: {},
    create: {
      facultyName: 'Faculty of Computer Science & Information Technology',
      facultyCode: 'FCSIT',
    },
  });

  const feng = await prisma.faculty.upsert({
    where: { facultyCode: 'FENG' },
    update: {},
    create: {
      facultyName: 'Faculty of Engineering',
      facultyCode: 'FENG',
    },
  });

  const fps = await prisma.faculty.upsert({
    where: { facultyCode: 'FPS' },
    update: {},
    create: {
      facultyName: 'Faculty of Physical Sciences',
      facultyCode: 'FPS',
    },
  });
  console.log('BUK Faculties created.');

  // 3. Create Programmes / Courses
  const cscCourse = await prisma.course.upsert({
    where: { courseCode: 'B.Sc. CSC' },
    update: {},
    create: {
      name: 'B.Sc. Computer Science',
      courseCode: 'B.Sc. CSC',
      facultyId: fcsit.id,
    },
  });

  const sweCourse = await prisma.course.upsert({
    where: { courseCode: 'B.Sc. SWE' },
    update: {},
    create: {
      name: 'B.Sc. Software Engineering',
      courseCode: 'B.Sc. SWE',
      facultyId: fcsit.id,
    },
  });

  const eeeCourse = await prisma.course.upsert({
    where: { courseCode: 'B.Eng. EEE' },
    update: {},
    create: {
      name: 'B.Eng. Electrical Engineering',
      courseCode: 'B.Eng. EEE',
      facultyId: feng.id,
    },
  });
  console.log('Academic Programmes created.');

  // 4. Create Units
  const aiUnit = await prisma.unit.upsert({
    where: { unitCode: 'CSC 4201' },
    update: {},
    create: {
      name: 'Artificial Intelligence & Neural Systems',
      unitCode: 'CSC 4201',
      courseId: cscCourse.id,
    },
  });

  const dbUnit = await prisma.unit.upsert({
    where: { unitCode: 'CSC 3205' },
    update: {},
    create: {
      name: 'Database Architecture & Big Data Systems',
      unitCode: 'CSC 3205',
      courseId: cscCourse.id,
    },
  });

  const sweUnit = await prisma.unit.upsert({
    where: { unitCode: 'SWE 3302' },
    update: {},
    create: {
      name: 'Cloud Computing & Software Architecture',
      unitCode: 'SWE 3302',
      courseId: sweCourse.id,
    },
  });
  console.log('Course Units created.');

  // 5. Create Venues
  await prisma.venue.upsert({
    where: { className: 'FCSIT Lecture Theatre 1' },
    update: {},
    create: {
      className: 'FCSIT Lecture Theatre 1',
      facultyCode: 'FCSIT',
      facultyId: fcsit.id,
      capacity: 120,
      classification: 'Lecture Theatre',
      currentStatus: 'available',
    },
  });

  await prisma.venue.upsert({
    where: { className: 'New Campus Twin Lecture Theatre (TLT)' },
    update: {},
    create: {
      className: 'New Campus Twin Lecture Theatre (TLT)',
      facultyCode: 'FCSIT',
      facultyId: fcsit.id,
      capacity: 250,
      classification: 'Auditorium',
      currentStatus: 'available',
    },
  });

  await prisma.venue.upsert({
    where: { className: 'Software Engineering Laboratory A' },
    update: {},
    create: {
      className: 'Software Engineering Laboratory A',
      facultyCode: 'FCSIT',
      facultyId: fcsit.id,
      capacity: 60,
      classification: 'Computer Lab',
      currentStatus: 'available',
    },
  });
  console.log('Lecture Venues created.');

  // 6. Create Default Lecturer
  const lecturerPassword = await bcrypt.hash('@lecturer_', 10);
  const lecturer = await prisma.lecturer.upsert({
    where: { email: 'lecturer@buk.edu.ng' },
    update: { password: lecturerPassword },
    create: {
      firstName: 'Dr. Mark',
      lastName: 'Ibrahim',
      email: 'lecturer@buk.edu.ng',
      password: lecturerPassword,
      phoneNo: '+2348031234567',
      facultyCode: 'FCSIT',
      facultyId: fcsit.id,
    },
  });

  // Assign lecturer to units
  await prisma.lecturerUnit.upsert({
    where: {
      lecturerId_unitId: {
        lecturerId: lecturer.id,
        unitId: aiUnit.id,
      },
    },
    update: {},
    create: {
      lecturerId: lecturer.id,
      unitId: aiUnit.id,
    },
  });

  await prisma.lecturerUnit.upsert({
    where: {
      lecturerId_unitId: {
        lecturerId: lecturer.id,
        unitId: dbUnit.id,
      },
    },
    update: {},
    create: {
      lecturerId: lecturer.id,
      unitId: dbUnit.id,
    },
  });
  console.log(`Lecturer ${lecturer.firstName} ${lecturer.lastName} assigned to units.`);

  // 7. Create Demo Students with password @student123
  const defaultStudentPassword = await bcrypt.hash('@student123', 10);
  const students = [
    {
      firstName: 'Amina',
      lastName: 'Suleiman',
      regNo: 'CST/21/COM/00101',
      email: 'amina.suleiman@buk.edu.ng',
    },
    {
      firstName: 'Usman',
      lastName: 'Danjuma',
      regNo: 'CST/21/COM/00102',
      email: 'usman.danjuma@buk.edu.ng',
    },
    {
      firstName: 'Fatima',
      lastName: 'Bello',
      regNo: 'CST/21/COM/00103',
      email: 'fatima.bello@buk.edu.ng',
    },
  ];

  for (const s of students) {
    const student = await prisma.student.upsert({
      where: { registrationNumber: s.regNo },
      update: { password: defaultStudentPassword },
      create: {
        firstName: s.firstName,
        lastName: s.lastName,
        registrationNumber: s.regNo,
        email: s.email,
        password: defaultStudentPassword,
        faculty: 'FCSIT',
        courseCode: 'B.Sc. CSC',
        courseId: cscCourse.id,
      },
    });

    // Assign student to AI unit & Database unit
    await prisma.studentUnit.upsert({
      where: {
        studentId_unitId: {
          studentId: student.id,
          unitId: aiUnit.id,
        },
      },
      update: {},
      create: {
        studentId: student.id,
        unitId: aiUnit.id,
      },
    });

    await prisma.studentUnit.upsert({
      where: {
        studentId_unitId: {
          studentId: student.id,
          unitId: dbUnit.id,
        },
      },
      update: {},
      create: {
        studentId: student.id,
        unitId: dbUnit.id,
      },
    });
  }
  console.log('Sample BUK Students enrolled and assigned.');

  // 8. Seed Demo Attendance Records
  const amina = await prisma.student.findUnique({ where: { registrationNumber: 'CST/21/COM/00101' } });
  const usman = await prisma.student.findUnique({ where: { registrationNumber: 'CST/21/COM/00102' } });

  if (amina) {
    // 4 present records for Amina (High attendance)
    for (let i = 1; i <= 4; i++) {
      await prisma.attendance.create({
        data: {
          studentRegistrationNumber: amina.registrationNumber,
          studentId: amina.id,
          courseCode: 'B.Sc. CSC',
          unitCode: 'CSC 4201',
          unitId: aiUnit.id,
          venue: 'FCSIT Lecture Theatre 1',
          attendanceStatus: 'Present',
          timeMarked: `09:1${i} AM`,
          dateMarked: new Date(Date.now() - i * 86400000 * 2),
        },
      });
    }
  }

  if (usman) {
    // Usman has missed classes and a pending medical excuse
    await prisma.absenceExcuse.create({
      data: {
        studentId: usman.id,
        unitId: aiUnit.id,
        reason: 'Medical Illness',
        description: 'Admitted at Aminu Kano Teaching Hospital (AKTH) with acute typhoid fever. Attached discharge summary.',
        documentUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80',
        dateMissed: new Date(Date.now() - 86400000 * 3),
        status: 'PENDING',
      },
    });
  }

  // 9. Initial Enterprise Audit Log
  await prisma.auditLog.create({
    data: {
      actorRole: 'ADMIN',
      actorEmail: 'admin@buk.edu.ng',
      action: 'SYSTEM_INITIALIZED',
      details: 'BUK-FRAS Enterprise biometric registry initialized with cloud schema and sample cohort.',
      ipAddress: '127.0.0.1',
    },
  });

  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
