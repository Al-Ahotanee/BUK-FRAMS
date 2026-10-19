import { cookies } from 'next/headers';

export interface UserSession {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'lecturer' | 'student';
  regNo?: string;
  faculty?: string;
}

const COOKIE_NAME = 'buk_auth_session';

export function createSessionCookie(user: UserSession): string {
  const payload = JSON.stringify({
    ...user,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  });
  return Buffer.from(payload).toString('base64');
}

export function parseSessionCookie(token: string): UserSession | null {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf-8');
    const data = JSON.parse(raw);
    if (data.exp && data.exp < Date.now()) {
      return null;
    }
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      regNo: data.regNo,
      faculty: data.faculty,
    };
  } catch {
    return null;
  }
}

export function getSession(): UserSession | null {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return parseSessionCookie(token);
}
