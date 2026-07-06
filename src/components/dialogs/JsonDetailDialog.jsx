import { JsonCodeBlock } from "../try-it-out/JsonCodeBlock.jsx";

const { useEffect, useMemo } = React;
const { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, IconButton, Tooltip, Chip } = MaterialUI;
const { SwIcon } = window.__ISA_SWAGGER__ || {};

/**
 * Modal de detalle compacto: muestra JSON (pretty-printed) con título, label y
 * contador de bytes/líneas. Reutiliza <JsonCodeBlock> para colorear.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - title: string (cabecera)
 *  - label: string (etiqueta corta)
 *  - content: any (string u objeto a mostrar pretty-print JSON)
 */
export function JsonDetailDialog({ open, onClose, title, label, content }) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    const text = useMemo(() => {
        if (content == null) return "";
        if (typeof content === "string") {
            const t = content.trim();
            if (t.startsWith("{") || t.startsWith("[") || t.startsWith("`")) {
                try { return JSON.stringify(JSON.parse(t.startsWith("`") ? t.slice(1, -1) : t), null, 2); }
                catch { return content; }
            }
            return content;
        }
        try { return JSON.stringify(content, null, 2); }
        catch { return String(content); }
    }, [content]);

    const bytes = useMemo(() => (text ? new TextEncoder().encode(text).length : 0), [text]);
    const lines = useMemo(() => (text ? text.split("\n").length : 0), [text]);
    const isLikelyJson = useMemo(() => {
        const t = (text || "").trim();
        return t.startsWith("{") || t.startsWith("[");
    }, [text]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            aria-labelledby="isa-sw-json-detail-title"
            className="isa-sw-json-detail-dialog"
            PaperProps={{ sx: { borderRadius: "0.75rem", overflow: "hidden" } }}
        >
            <DialogTitle id="isa-sw-json-detail-title" sx={{ display: "flex", alignItems: "center", gap: 1, pb: 0.75 }}>
                <Box component="span" className="isa-sw-chip" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 0.75, py: 0.25, borderRadius: 1, bgcolor: "action.hover", fontSize: "0.75rem", fontWeight: 600 }}>
                    <span aria-hidden>🔍</span> Detalle
                </Box>
                <Box component="span" sx={{ flex: 1, fontWeight: 600, fontSize: "1rem" }}>
                    {title || label || "Detalle"}
                </Box>
                <Tooltip title="Cerrar (Esc)">
                    <IconButton size="small" onClick={onClose} aria-label="Cerrar detalle">
                        ×
                    </IconButton>
                </Tooltip>
            </DialogTitle>
            {label || bytes ? (
                <Box sx={{ px: 3, pt: 0.25, pb: 1, display: "flex", gap: 0.75, alignItems: "center", flexWrap: "wrap" }}>
                    {label ? <Chip size="small" label={label} variant="outlined" /> : null}
                    {bytes ? <Chip size="small" label={`${bytes}B`} variant="outlined" /> : null}
                    {lines ? <Chip size="small" label={`${lines} líneas`} variant="outlined" /> : null}
                    {isLikelyJson ? <Chip size="small" label="JSON" color="info" variant="outlined" /> : null}
                </Box>
            ) : null}
            <DialogContent dividers sx={{ p: 0, bgcolor: "background.default" }}>
                {text
                    ? <JsonCodeBlock value={text} maxHeight="60vh" />
                    : <Box sx={{ p: 3, color: "text.secondary", fontStyle: "italic" }}>(sin contenido)</Box>}
            </DialogContent>
            <DialogActions sx={{ px: 2.5, py: 1 }}>
                <Button size="small" onClick={() => { try { navigator.clipboard?.writeText(text || ""); } catch { /* ignore */ } }}>
                    Copiar
                </Button>
                <Button size="small" variant="contained" onClick={onClose}>Cerrar</Button>
            </DialogActions>
        </Dialog>
    );
}
