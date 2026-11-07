import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function uploadImage(data: { buffer: Buffer; size: number }): Promise<string> {
  const { buffer, size } = data;
  if (!buffer || size === 0) {
    throw new Error('No file provided');
  }

  if (size > 5 * 1024 * 1024) {
    throw new Error('File size exceeds 5MB limit');
  }

  // Validate magic bytes (MIME sniffing)
  const isJpeg = buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer.length > 3 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isWebp = buffer.length > 11 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;

  let ext = '';
  let contentType = '';
  if (isJpeg) {
    ext = 'jpg';
    contentType = 'image/jpeg';
  } else if (isPng) {
    ext = 'png';
    contentType = 'image/png';
  } else if (isWebp) {
    ext = 'webp';
    contentType = 'image/webp';
  } else {
    throw new Error('Invalid image format. Only valid JPEG, PNG, and WebP image files are accepted.');
  }

  const filename = `${crypto.randomUUID()}_${Date.now()}.${ext}`;

  if (process.env.STORAGE_PROVIDER === 's3' && process.env.S3_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    const key = `listings/${filename}`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    if (process.env.S3_PUBLIC_URL) {
        return `${process.env.S3_PUBLIC_URL}/${key}`;
    }
    return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
  } else {
    if (process.env.STORAGE_PROVIDER === 'local') {
        console.warn('Startup Warning: STORAGE_PROVIDER=local is set. Files will be lost on redeploy unless UPLOAD_DIR is a persistent volume.');
    }
    const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  }
}
