import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyLineSignature(rawBody: string, signature: string | undefined, secret: string): boolean {
  if (!signature) {
    return false;
  }

  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const digestBuffer = Buffer.from(digest);
  const signatureBuffer = Buffer.from(signature);

  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(digestBuffer, signatureBuffer);
}
