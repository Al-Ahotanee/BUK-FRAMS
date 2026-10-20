import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [
      totalStudents,
      totalUnits,
      faculties,
      attendances,
      studentsWithAttendance,
      venues,
    ] = await Promise.all([
      db.student.count(),
      db.unit.count(),
      db.faculty.findMany({
        include: {
          courses: {
            include: {
              students: true,
            },
          },
        },
      }),
      db.attendance.findMany({
        orderBy: { dateMarked: 'desc' },
        include: {
          unit: true,
          student: true,
        },
      }),
      db.student.findMany({
        include: {
          attendances: true,
          course: {
            include: {
              faculty: true,
            },
          },
        },
      }),
      db.venue.findMany(),
    ]);

    // 1. Overall Statistics
    const totalAttendanceCount = attendances.length;
    const presentCount = attendances.filter((a) => a.attendanceStatus === 'Present').length;
    const absentCount = attendances.filter((a) => a.attendanceStatus === 'Absent').length;
    const excusedCount = attendances.filter((a) => a.attendanceStatus === 'Excused').length;
    const overallRate = totalAttendanceCount > 0 ? Math.round((presentCount / totalAttendanceCount) * 100) : 0;

    // 2. 14-Day Attendance Trend
    const trendMap: { [date: string]: { total: number; present: number; absent: number } } = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trendMap[dateStr] = { total: 0, present: 0, absent: 0 };
    }

    attendances.forEach((a) => {
      const dateStr = new Date(a.dateMarked).toISOString().split('T')[0];
      if (trendMap[dateStr]) {
        trendMap[dateStr].total++;
        if (a.attendanceStatus === 'Present') {
          trendMap[dateStr].present++;
        } else {
          trendMap[dateStr].absent++;
        }
      }
    });

    const trend = Object.entries(trendMap).map(([date, val]) => ({
      date,
      total: val.total,
      present: val.present,
      absent: val.absent,
      rate: val.total > 0 ? Math.round((val.present / val.total) * 100) : 0,
    }));

    // 3. Faculty Compliance Breakdown
    const facultyMetrics = faculties.map((f) => {
      let facultyStudents = 0;
      f.courses.forEach((c) => {
        facultyStudents += c.students.length;
      });

      // Filter attendances for students in this faculty
      const facultyAttendances = attendances.filter((a) => a.student?.faculty === f.facultyCode);
      const facTotal = facultyAttendances.length;
      const facPresent = facultyAttendances.filter((a) => a.attendanceStatus === 'Present').length;
      const rate = facTotal > 0 ? Math.round((facPresent / facTotal) * 100) : 0;

      return {
        id: f.id,
        name: f.facultyName,
        code: f.facultyCode,
        studentsCount: facultyStudents,
        sessionsCount: facTotal,
        presentCount: facPresent,
        attendanceRate: rate,
      };
    });

    // 4. Defaulters Analysis (< 70% BUK threshold)
    const defaulters: any[] = [];
    studentsWithAttendance.forEach((s) => {
      const totalSessions = s.attendances.length;
      if (totalSessions > 0) {
        const attended = s.attendances.filter((a) => a.attendanceStatus === 'Present' || a.attendanceStatus === 'Excused').length;
        const rate = Math.round((attended / totalSessions) * 100);

        if (rate < 70) {
          defaulters.push({
            id: s.id,
            registrationNumber: s.registrationNumber,
            name: `${s.firstName} ${s.lastName}`,
            email: s.email,
            faculty: s.course?.faculty?.facultyCode || s.faculty,
            courseCode: s.courseCode,
            totalSessions,
            attendedSessions: attended,
            attendanceRate: rate,
            isDefaulter: true,
          });
        }
      }
    });

    // 5. Venue Utilization
    const venueUsage = venues.map((v) => {
      const logs = attendances.filter((a) => a.venue === v.className);
      return {
        id: v.id,
        name: v.className,
        capacity: v.capacity,
        totalSessions: logs.length,
      };
    }).sort((a, b) => b.totalSessions - a.totalSessions);

    return NextResponse.json({
      status: 'success',
      data: {
        summary: {
          totalStudents,
          totalUnits,
          totalAttendanceCount,
          presentCount,
          absentCount,
          excusedCount,
          overallRate,
          defaulterCount: defaulters.length,
        },
        trend,
        facultyMetrics,
        defaulters: defaulters.sort((a, b) => a.attendanceRate - b.attendanceRate),
        venueUsage,
      },
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to generate institutional analytics' }, { status: 500 });
  }
}
