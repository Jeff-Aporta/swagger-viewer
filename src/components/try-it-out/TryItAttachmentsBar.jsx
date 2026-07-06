import { filesToAudioEntries, filesToBinaryEntries, filesToImageEntries, clipboardImageDataUrl } from "../../lib/media/file-data-url.js";
import { SwIcon } from "../../lib/ui/sw-icon.jsx";

const { useRef, useCallback } = React;
const { Box, Stack, Button, Chip, Typography, Tooltip } = MaterialUI;

function notify(msg, severity = "warning") {
  const fn = globalThis.ISAFront?.toast?.[severity === "error" ? "error" : severity === "success" ? "success" : "warning"];
  if (typeof fn === "function") fn(msg);
}

export function TryItAttachmentsBar({ config, attachments, onChange, disabled, ns = "ISA" }) {
  const imgRef = useRef(null);
  const audRef = useRef(null);
  const fileRef = useRef(null);
  const images = attachments?.images || [];
  const audios = attachments?.audios || [];
  const files = attachments?.files || [];
  const imgCfg = config?.images;
  const audCfg = config?.audios;
  const fileCfg = config?.files;
  const isMultipart = config?.mode === "multipart";

  const patch = useCallback((part) => onChange?.({ images, audios, files, ...part }), [onChange, images, audios, files]);

  async function onPickImages(e) {
    const list = e.target.files;
    e.target.value = "";
    if (!list?.length || !imgCfg) return;
    try {
      const added = await filesToImageEntries(list, imgCfg.max || 10);
      if (!added.length) return notify("Solo imágenes PNG, JPEG, WebP o GIF");
      const merged = [...images, ...added].slice(0, imgCfg.max || 10);
      if (merged.length < images.length + added.length) notify(`Máximo ${imgCfg.max || 10} imágenes`);
      patch({ images: merged });
    } catch (err) {
      notify(err?.message || String(err), "error");
    }
  }

  async function onPickAudios(e) {
    const list = e.target.files;
    e.target.value = "";
    if (!list?.length || !audCfg) return;
    try {
      const added = await filesToAudioEntries(list, audCfg.max || 5);
      if (!added.length) return notify("Solo audios WebM, MP3, M4A, WAV u OGG");
      const merged = [...audios, ...added].slice(0, audCfg.max || 5);
      if (merged.length < audios.length + added.length) notify(`Máximo ${audCfg.max || 5} audios`);
      patch({ audios: merged });
    } catch (err) {
      notify(err?.message || String(err), "error");
    }
  }

  async function onPickFiles(e) {
    const list = e.target.files;
    e.target.value = "";
    if (!list?.length) return;
    try {
      const added = await filesToBinaryEntries(list, fileCfg?.max || 10);
      if (!added.length) return;
      const withField = added.map((a) => ({ ...a, field: fileCfg?.field || "file" }));
      patch({ files: [...files, ...withField].slice(0, fileCfg?.max || 10) });
    } catch (err) {
      notify(err?.message || String(err), "error");
    }
  }

  const onPaste = useCallback(async (e) => {
    if (disabled || !imgCfg?.clipboard) return;
    const dataUrl = await clipboardImageDataUrl(e);
    if (!dataUrl) return;
    e.preventDefault();
    if (images.length >= (imgCfg.max || 10)) return notify(`Máximo ${imgCfg.max || 10} imágenes`);
    patch({ images: [...images, { id: `clip-${Date.now()}`, name: "portapapeles", dataUrl, kind: "image" }] });
  }, [disabled, imgCfg, images, patch]);

  function remove(kind, id) {
    if (kind === "image") patch({ images: images.filter((x) => x.id !== id) });
    else if (kind === "audio") patch({ audios: audios.filter((x) => x.id !== id) });
    else patch({ files: files.filter((x) => x.id !== id) });
  }

  const total = images.length + audios.length + files.length;
  if (!imgCfg && !audCfg && !fileCfg && !isMultipart) return null;

  return (
    <Box className="isa-sw-attachments" sx={{ mt: 1, p: 1, borderRadius: 1, border: "1px solid", borderColor: "divider", bgcolor: "action.hover" }} onPaste={onPaste} tabIndex={0}>
      <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center">
        <Typography variant="caption" color="text.secondary" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mr: 0.5 }}>
          <SwIcon icon="mdi:paperclip" size={14} ns={ns} />
          Adjuntos
        </Typography>
        {imgCfg?.filePicker !== false ? (
          <>
            <input ref={imgRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={onPickImages} />
            <Tooltip title={imgCfg?.clipboard !== false ? "Imagen (Ctrl+V en este panel)" : "Imagen del sistema"} arrow>
              <Button size="small" variant="outlined" disabled={disabled} onClick={() => imgRef.current?.click()} startIcon={<SwIcon icon="mdi:image-plus-outline" size={16} ns={ns} />}>
                Imagen
              </Button>
            </Tooltip>
          </>
        ) : null}
        {audCfg?.filePicker !== false ? (
          <>
            <input ref={audRef} type="file" accept="audio/*" multiple hidden onChange={onPickAudios} />
            <Button size="small" variant="outlined" disabled={disabled} onClick={() => audRef.current?.click()} startIcon={<SwIcon icon="mdi:microphone-outline" size={16} ns={ns} />}>
              Audio
            </Button>
          </>
        ) : null}
        {(fileCfg || isMultipart) ? (
          <>
            <input ref={fileRef} type="file" accept={fileCfg?.accept || "*/*"} multiple hidden onChange={onPickFiles} />
            <Button size="small" variant="outlined" disabled={disabled} onClick={() => fileRef.current?.click()} startIcon={<SwIcon icon="mdi:file-upload-outline" size={16} ns={ns} />}>
              Archivo
            </Button>
          </>
        ) : null}
        {imgCfg?.encoding === "base64Object" ? (
          <Typography variant="caption" color="text.secondary">→ body: {"{ mime, base64 }"}</Typography>
        ) : (
          <Typography variant="caption" color="text.secondary">→ body: data URL en {imgCfg?.field || "imagenes"} / {audCfg?.field || "audios"}</Typography>
        )}
      </Stack>
      {total > 0 ? (
        <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.75 }}>
          {images.map((e) => (
            <Chip key={e.id} size="small" variant="outlined" color="info" onDelete={disabled ? undefined : () => remove("image", e.id)} icon={<SwIcon icon="mdi:image-outline" size={14} ns={ns} />} label={e.name} />
          ))}
          {audios.map((e) => (
            <Chip key={e.id} size="small" variant="outlined" color="secondary" onDelete={disabled ? undefined : () => remove("audio", e.id)} icon={<SwIcon icon="mdi:waveform" size={14} ns={ns} />} label={e.name} />
          ))}
          {files.map((e) => (
            <Chip key={e.id} size="small" variant="outlined" onDelete={disabled ? undefined : () => remove("file", e.id)} icon={<SwIcon icon="mdi:file-outline" size={14} ns={ns} />} label={e.name} />
          ))}
        </Stack>
      ) : null}
    </Box>
  );
}
