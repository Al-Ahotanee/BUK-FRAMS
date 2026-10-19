import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  cookies().delete('buk_auth_session');
  return NextResponse.json({ status: 'success', message: 'Logged out successfully' });
}
