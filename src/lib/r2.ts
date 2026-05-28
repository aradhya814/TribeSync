import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

const accountId = requiredEnv('R2_ACCOUNT_ID')
const accessKeyId = requiredEnv('R2_ACCESS_KEY_ID')
const secretAccessKey = requiredEnv('R2_SECRET_ACCESS_KEY')
const bucketName = requiredEnv('R2_BUCKET_NAME')

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
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
