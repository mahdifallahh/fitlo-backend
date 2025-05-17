import { S3Client } from '@aws-sdk/client-s3';
if (!process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY) {
    throw new Error('MINIO_ACCESS_KEY and MINIO_SECRET_KEY must be defined');
  }
console.log({
    endpoint: process.env.MINIO_ENDPOINT,
    region: process.env.MINIO_REGION,
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY ? '****' : undefined,
    bucket: process.env.MINIO_BUCKET,
  });
export const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
  region: process.env.MINIO_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'defaultAccessKey',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'defaultSecretKey',
  },
  forcePathStyle: true,
});