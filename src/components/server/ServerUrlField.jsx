import { SwIcon } from "../../lib/ui/sw-icon.jsx";

const { Box, Tooltip, IconButton, Chip } = MaterialUI;

/**
 * Indicador del host API conectado en el toolbar del visor.
 *
 * Modos:
 *   - editable (`!fixed && onChange`): input controlado.
 *   - sólo lectura (`fixed` o sin onChange): chip truncado + icono copiar.
 *
 * El toolbar del visor siempre usa `fixed={true}` (la conn viene por ?conn=
 * del Welcome); por defecto se muestra el chip, no el input.
 */
export function ServerUrlField({ value, ns = "ISS", dense = false, compact = false, fixed = false, onClick, onChange }) {
    const inputH = dense ? 24 : 36;
    const inputFs = dense ? "0.7rem" : "0.8125rem";
    const isEditable = !fixed && typeof onChange === "function";
    const text = String(value || "").trim();

    async function copyToClipboard() {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            /* ignore */
        }
    }

    if (isEditable) {
        return (
            <input
                type="text"
                value={text}
                onChange={(e) => onChange?.(e.target.value)}
                placeholder="https://host…/api"
                aria-label="Servidor API"
                className="isa-sw-server-field"
                style={{
                    minWidth: dense ? 0 : compact ? 0 : 220,
                    width: compact ? "clamp(8rem, 30vw, 16rem)" : "100%",
                    maxWidth: 420,
                    height: inputH,
                    fontFamily: "ui-monospace, monospace",
                    fontSize: inputFs,
                    padding: "0 8px",
                    border: "1px solid rgba(127,127,127,0.35)",
                    borderRadius: 6,
                    background: "transparent",
                    color: "inherit",
                    outline: "none",
                }}
            />
        );
    }

    /** Host de sólo lectura — chip compacto con tooltip y botón copiar. */
    return (
        <Tooltip title={text || "—"} arrow placement="bottom">
            <Chip
                size="small"
                variant="outlined"
                color="info"
                icon={<SwIcon icon="mdi:api" size={dense ? 13 : 16} ns={ns} aria-hidden />}
                label={text || "—"}
                onClick={onClick}
                className="isa-sw-server-field"
                sx={{
                    height: inputH,
                    maxWidth: dense ? 140 : compact ? 220 : 320,
                    borderRadius: 1,
                    cursor: onClick ? "pointer" : "default",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: inputFs,
                    "& .MuiChip-label": {
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        px: 0.5,
                    },
                    "& .MuiChip-icon": { ml: 0.5 },
                }}
                deleteIcon={<SwIcon icon="mdi:content-copy" size={dense ? 12 : 14} ns={ns} aria-hidden />}
                onDelete={text ? copyToClipboard : undefined}
            />
        </Tooltip>
    );
}