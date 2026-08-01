import { getImageKitAuth } from "./imagekit.functions";

export const IMAGEKIT_PUBLIC_KEY = "public_wiJcFvuyvL/iVi43yyBZFMijf1g=";

/** Uploads a file to ImageKit and returns its public URL. */
export async function uploadToImageKit(file: File, folder = "/ads"): Promise<string> {
  const auth = await getImageKitAuth();

  const fd = new FormData();
  fd.append("file", file);
  fd.append("fileName", file.name);
  fd.append("publicKey", IMAGEKIT_PUBLIC_KEY);
  fd.append("folder", folder);
  fd.append("token", auth.token);
  fd.append("expire", String(auth.expire));
  fd.append("signature", auth.signature);
  fd.append("useUniqueFileName", "true");

  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: fd,
  });
  const json = (await res.json()) as { url?: string; message?: string };
  if (!res.ok || !json.url) throw new Error(json.message || "ImageKit upload failed");
  return json.url;
}
