import { db } from '@/lib/db';

export interface AuditLogParams {
  actorRole: 'ADMIN' | 'LECTURER' | 'STUDENT' | 'SYSTEM';
  actorEmail: string;
  action: string;
  details?: string;
  ipAddress?: string;
}

export async function logAuditEvent({
  actorRole,
  actorEmail,
  action,
  details,
  ipAddress = '127.0.0.1',
}: AuditLogParams) {
  try {
    await db.auditLog.create({
      data: {
        actorRole,
        actorEmail,
        action,
        details,
        ipAddress,
      },
    });
  } catch (error) {
    console.error('[AuditLog] Failed to record audit event:', error);
  }
}
