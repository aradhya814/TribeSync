import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const bucketName = process.env.R2_BUCKET_NAME ?? 'tribesync'

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ACCOUNT_ID
    ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
})

export async function uploadToR2(key: string, buffer: Buffer, contentType: string) {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  )

  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, '')
  return publicUrl ? `${publicUrl}/${key}` : key
}

export async function getSignedR2Url(key: string, expiresIn = 60 * 10) {
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
    { expiresIn },
  )
}
