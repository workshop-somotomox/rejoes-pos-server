import { randomUUID } from 'crypto';
import {
  DeleteObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

async function main() {
  const endpointId = requireEnv('R2_ENDPOINT');
  const bucket = requireEnv('R2_BUCKET');

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${endpointId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
  });

  console.log('Checking bucket access for', bucket);
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
  console.log('Bucket is reachable.');

  const key = `diagnostics/${randomUUID()}.txt`;
  const body = `diagnostic upload at ${new Date().toISOString()}`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'text/plain',
    })
  );
  console.log('PutObject succeeded:', key);

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
  console.log('Cleanup succeeded.');
}

main().catch((err) => {
  console.error('R2 diagnostic failed:', err);
  process.exitCode = 1;
});
