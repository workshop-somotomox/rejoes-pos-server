import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config';

// Create S3Client only when needed
function createS3Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.r2.endpoint}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.r2.accessKeyId,
      secretAccessKey: config.r2.secretAccessKey,
    },
  });
}

export interface ImageMetadata {
  originalName: string;
  mimeType: string;
  size: number;
}

function getFileExtension(mimeType: string): string {
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  return extMap[mimeType] || 'jpg';
}

export async function uploadImage(
  buffer: Buffer,
  metadata: ImageMetadata,
  memberId: string,
  uploadId: string
): Promise<string> {
  if (!config.r2.endpoint || !config.r2.accessKeyId) {
    throw new Error('R2 configuration is missing');
  }

  const ext = getFileExtension(metadata.mimeType);
  const r2Key = `loans/${memberId}/${uploadId}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: config.r2.bucket,
    Key: r2Key,
    Body: buffer,
    ContentType: metadata.mimeType,
    Metadata: {
      originalName: metadata.originalName,
      size: metadata.size.toString(),
    },
  });

  const s3Client = createS3Client();
  await s3Client.send(command);
  return r2Key;
}
