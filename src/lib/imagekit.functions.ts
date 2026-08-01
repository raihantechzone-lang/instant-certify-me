import { createServerFn } from "@tanstack/react-start";

/**
 * ImageKit browser uploads must be signed server-side.
 * Returns { token, expire, signature } for the upload API.
 */
export const getImageKitAuth = createServerFn({ method: "GET" }).handler(async () => {
  const privateKey = process.env["IMAGEKIT_PRIVATE_KEY"];
  if (!privateKey) throw new Error("IMAGEKIT_PRIVATE_KEY is not configured");

  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 60 * 10;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(privateKey),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(token + expire));
  const signature = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return { token, expire, signature };
});
