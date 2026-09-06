const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.S3_BUCKET_NAME;
const ARCHIVE_CONTENT_TYPE = "application/gzip";
const URL_EXPIRY_SECONDS = 300;

// CLI PUTs the archive directly to this URL — the file never passes
// through the Express server, and the bucket can stay fully private since
// nothing is ever served except through a short-lived signed URL.
async function getUploadUrl(key) {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: ARCHIVE_CONTENT_TYPE });
  return getSignedUrl(s3, command, { expiresIn: URL_EXPIRY_SECONDS });
}

async function getDownloadUrl(key) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: URL_EXPIRY_SECONDS });
}

// Used by the web code viewer, which reads file contents server-side rather
// than handing the whole archive to the browser (the CLI uses the presigned
// URL above instead, since it just wants the raw file).
async function getObjectBuffer(key) {
  const response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks = [];
  for await (const chunk of response.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// Used when the server itself needs to write an object directly (an OWNER/
// MAINTAINER edit on the website re-packs the archive and uploads it right
// here, rather than round-tripping through a presigned URL like the CLI does).
async function putObjectBuffer(key, buffer) {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: ARCHIVE_CONTENT_TYPE }));
}

module.exports = { getUploadUrl, getDownloadUrl, getObjectBuffer, putObjectBuffer, ARCHIVE_CONTENT_TYPE };
