import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

export const s3Config = {
  endpoint: process.env.S3_ENDPOINT!,
  region: process.env.S3_REGION || 'ru-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!
  },
  forcePathStyle: true,
  maxAttempts: 2,
  requestTimeoutMs: 300000,
  connectionTimeout: 30000,
  socketTimeout: 300000
};

export const s3Client = new S3Client(s3Config);

export const S3_BUCKET = process.env.S3_BUCKET!;
export const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL!;
