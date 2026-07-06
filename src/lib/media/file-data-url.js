/** Lectura de archivos / portapapeles → data URL (Try it out). */

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export async function clipboardImageDataUrl(clipboardEvent) {
  const items = clipboardEvent?.clipboardData?.items;
  if (!items?.length) return null;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.type.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (!file) continue;
    return readFileAsDataUrl(file);
  }
  return null;
}

const IMAGE_MIMES = /^image\/(png|jpe?g|webp|gif)$/i;
const AUDIO_MIMES = /^audio\/(webm|mpeg|mp3|mp4|x-m4a|wav|ogg|x-wav)/i;

export function isImageFile(file) {
  const t = String(file?.type || "");
  return IMAGE_MIMES.test(t) || /\.(png|jpe?g|webp|gif)$/i.test(String(file?.name || ""));
}

export function isAudioFile(file) {
  const t = String(file?.type || "");
  return AUDIO_MIMES.test(t) || /\.(webm|mp3|m4a|wav|ogg)$/i.test(String(file?.name || ""));
}

export async function filesToImageEntries(files, max = 10) {
  const out = [];
  for (const file of files) {
    if (!isImageFile(file)) continue;
    const dataUrl = await readFileAsDataUrl(file);
    out.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: file.name || "imagen", dataUrl, kind: "image" });
    if (out.length >= max) break;
  }
  return out;
}

export async function filesToAudioEntries(files, max = 5) {
  const out = [];
  for (const file of files) {
    if (!isAudioFile(file)) continue;
    const dataUrl = await readFileAsDataUrl(file);
    out.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: file.name || "audio", dataUrl, kind: "audio" });
    if (out.length >= max) break;
  }
  return out;
}

export async function filesToBinaryEntries(files, max = 10) {
  const out = [];
  for (const file of files) {
    out.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: file.name || "archivo", file, kind: "file" });
    if (out.length >= max) break;
  }
  return out;
}
