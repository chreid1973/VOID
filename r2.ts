// lib/r2.ts
// Cloudflare R2 is S3-compatible — we use the AWS SDK with a custom endpoint.
// R2 free tier: 10 GB storage, 1M write ops, 10M read ops per month.

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// R2 uses the standard S3 SDK pointed at Cloudflare's endpoint
export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: {
    accessKeyId:     process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

// ── Generate a presigned upload URL ───────────────────────────
// The client uploads directly to R2 — your server never handles the file bytes.
// This keeps Vercel function cold-start times fast and avoids the 4.5MB body limit.

export async function getUploadUrl(
  key: string,          // e.g. "posts/clxyz123.webp"
  contentType: string,  // e.g. "image/webp"
  expiresIn = 60        // URL expires in 1 minute
) {
  const command = new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn });
  return { uploadUrl, key, publicUrl: getPublicUrl(key) };
}

export async function getObjectUrl(key: string, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(r2, command, { expiresIn });
}

export async function getObjectBytes(key: string): Promise<Buffer> {
  const response = await r2.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );

  if (!response.Body) {
    throw new Error(`Object body missing for key: ${key}`);
  }

  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function putObjectBuffer(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
  cacheControl = "public, max-age=31536000, immutable"
) {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    })
  );

  return { key, publicUrl: getPublicUrl(key) };
}

// ── Delete an object ───────────────────────────────────────────

export async function deleteObject(key: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

// ── Get public URL for a key ───────────────────────────────────

export function getPublicUrl(key: string): string {
  return `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`;
}

export function extractStoredR2Key(imageRef: string): string | null {
  if (/^(?:posts|avatars)\//i.test(imageRef)) {
    return imageRef;
  }

  try {
    const url = new URL(imageRef);
    const pathname = url.pathname.replace(/^\/+/, "");

    if (url.hostname.endsWith(".r2.dev")) {
      return pathname || null;
    }

    if (url.hostname.endsWith(".r2.cloudflarestorage.com")) {
      if (pathname.startsWith(`${BUCKET}/`)) {
        return pathname.slice(BUCKET.length + 1) || null;
      }

      return pathname || null;
    }
  } catch {
    return null;
  }

  return null;
}

export function resolveStoredImageUrl(imageRef: string): string {
  const key = extractStoredR2Key(imageRef);

  if (key) {
    return `/api/media/${key
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/")}`;
  }

  return imageRef;
}
