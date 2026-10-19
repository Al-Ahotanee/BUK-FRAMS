import { NextResponse } from 'next/server';
import { uploadToStorage } from '@/lib/storage';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'documents';

    if (!file) {
      return NextResponse.json({ status: 'error', message: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileUrl = await uploadToStorage({
      buffer,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      folder,
    });

    return NextResponse.json({
      status: 'success',
      url: fileUrl,
      filename: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { status: 'error', message: 'File upload failed' },
      { status: 500 }
    );
  }
}
