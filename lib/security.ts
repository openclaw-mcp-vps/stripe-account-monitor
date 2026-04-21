import { CompactEncrypt, compactDecrypt } from "jose";

function encryptionSecret(): Uint8Array {
  const source =
    process.env.APP_ENCRYPTION_SECRET ??
    process.env.APP_JWT_SECRET ??
    process.env.STRIPE_WEBHOOK_SECRET ??
    "dev-encryption-secret-change-me";

  return new TextEncoder().encode(source.padEnd(32, "_").slice(0, 32));
}

export async function encryptSecret(value: string): Promise<string> {
  const payload = new TextEncoder().encode(value);

  return new CompactEncrypt(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .encrypt(encryptionSecret());
}

export async function decryptSecret(cipherText: string): Promise<string> {
  const { plaintext } = await compactDecrypt(cipherText, encryptionSecret());
  return new TextDecoder().decode(plaintext);
}
