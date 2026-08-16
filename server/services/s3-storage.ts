import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_BUCKET, S3_PUBLIC_URL } from '../config/s3';
import crypto from 'crypto';
import path from 'path';
import { Readable } from 'stream';

export interface UploadFileParams {
  file: Buffer | NodeJS.ReadableStream | Readable;
  userId: number;
  originalName: string;
  mimeType: string;
  fileSize?: number;
}

export interface S3FileMetadata {
  key: string;
  publicUrl: string;
  size: number;
}

export const generateS3Key = (userId: number, originalName: string): string => {
  const uniqueSuffix = crypto.randomBytes(16).toString('hex');
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  return `users/${userId}/${timestamp}-${uniqueSuffix}${ext}`;
};

export const uploadFileToS3 = async (params: UploadFileParams): Promise<S3FileMetadata> => {
  const { file, userId, originalName, mimeType, fileSize } = params;
  const key = generateS3Key(userId, originalName);

  const encodeMetadata = (str: string): string => {
    return Buffer.from(str).toString('base64');
  };

  const sanitizeMetadataKey = (key: string): string => {
    return key.toLowerCase().replace(/[^a-z0-9-]/g, '');
  };

  try {
    const parallelUploads = new Upload({
      client: s3Client,
      params: {
        Bucket: S3_BUCKET,
        Key: key,
        Body: file,
        ContentType: mimeType,
        Metadata: {
          [sanitizeMetadataKey('originalname')]: encodeMetadata(originalName),
          [sanitizeMetadataKey('userid')]: userId.toString(),
          [sanitizeMetadataKey('uploadedat')]: new Date().toISOString()
        }
      },
      queueSize: 6,
      partSize: 15 * 1024 * 1024,
      leavePartsOnError: false
    });

    await parallelUploads.done();

    const publicUrl = `${S3_PUBLIC_URL}/${key}`;

    return {
      key,
      publicUrl,
      size: fileSize || 0
    };
  } catch (error) {
    throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getFileFromS3 = async (key: string): Promise<NodeJS.ReadableStream> => {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error('File not found in S3');
  }

  return response.Body as NodeJS.ReadableStream;
};

export const deleteFileFromS3 = async (key: string): Promise<void> => {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key
  });

  await s3Client.send(command);
};

export const deleteMultipleFilesFromS3 = async (keys: string[]): Promise<void> => {
  if (keys.length === 0) {
    return;
  }

  const command = new DeleteObjectsCommand({
    Bucket: S3_BUCKET,
    Delete: {
      Objects: keys.map(key => ({ Key: key })),
      Quiet: true
    }
  });

  await s3Client.send(command);
};

export const generatePresignedUrl = async (key: string, expiresIn: number = 3600): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
};

export const checkFileExistsInS3 = async (key: string): Promise<boolean> => {
  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: key
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    return false;
  }
};

export const getFileMetadataFromS3 = async (key: string): Promise<{ size: number; contentType: string }> => {
  const command = new HeadObjectCommand({
    Bucket: S3_BUCKET,
    Key: key
  });

  const response = await s3Client.send(command);

  return {
    size: response.ContentLength || 0,
    contentType: response.ContentType || 'application/octet-stream'
  };
};
