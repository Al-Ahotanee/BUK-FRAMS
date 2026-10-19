import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

/**
 * Enterprise Object Storage Client
 * Supports AWS S3, Cloudflare R2, Neon/Supabase Storage, or any S3-compatible service.
 * Includes automatic graceful local fallback if cloud credentials are not supplied.
 */

const endpoint = process.env.AWS_ENDPOINT_URL_S3 || process.env.S3_ENDPOINT || undefined;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY || '';
const region = process.env.AWS_REGION || process.env.S3_REGION || 'us-east-2';
const bucketName = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME || 'buk-attendance-storage';
const publicDomain = process.env.S3_PUBLIC_DOMAIN || undefined;

const hasCloudStorage = Boolean(accessKeyId && secretAccessKey);

let s3Client: S3Client | null = null;
if (hasCloudStorage) {
  s3Client = new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: Boolean(endpoint), // Required for MinIO / custom S3 endpoints
  });
}

export interface UploadOptions {
  buffer: Buffer;
  filename: string;
  contentType: string;
  folder?: string;
}

export async function uploadToStorage({
  buffer,
  filename,
  contentType,
  folder = 'uploads',
}: UploadOptions): Promise<string> {
  const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueKey = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${cleanFilename}`;

  // 1. Cloud S3 Upload (If configured)
  if (hasCloudStorage && s3Client) {
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: uniqueKey,
        Body: buffer,
        ContentType: contentType,
      });

      await s3Client.send(command);

      if (publicDomain) {
        return `${publicDomain.replace(/\/$/, '')}/${uniqueKey}`;
      }

      if (endpoint) {
        return `${endpoint.replace(/\/$/, '')}/${bucketName}/${uniqueKey}`;
      }

      return `https://${bucketName}.s3.${region}.amazonaws.com/${uniqueKey}`;
    } catch (err) {
      console.error('[Storage] S3 cloud upload error, falling back to local storage:', err);
    }
  }

  // 2. Local Fallback (For local dev or before S3 bucket credentials are set)
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const localFilename = `${Date.now()}-${cleanFilename}`;
    const filePath = path.join(uploadDir, localFilename);
    fs.writeFileSync(filePath, buffer);

    return `/uploads/${folder}/${localFilename}`;
  } catch (localErr) {
    console.error('[Storage] Local storage write error, generating Base64 Data URL fallback:', localErr);
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  }
}
