/**
 * Tabla declarativa alimentada por `ctx.rows` (poblada por steps con `record`).
 * Columnas definidas en `test.table.columns[]` (label, align, width, etc.).
 */
const MaterialUI = globalThis.MaterialUI;
import { SwIcon } from "../../lib/ui/sw-icon.jsx";
import { useGlassColors } from "../../lib/ui/glass.jsx";

const { Box, Stack, Typography, Tooltip } = MaterialUI;

export function TestingTable({ table, rows, ns = "ISS" }) {
    const c = useGlassColors();
    if (!table || !Array.isArray(table.columns) || !table.columns.length) return null;
    const list = Array.isArray(rows) ? rows : [];

    if (!list.length) {
        return (
            <Box sx={{ width: "100%" }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                    <SwIcon icon={table.title ? "mdi:table" : "mdi:table-off"} size={14} ns={ns} aria-hidden />
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {table.title}
                    </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    {table.emptyMessage || "Sin filas registradas"}
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ width: "100%" }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                <SwIcon icon="mdi:table" size={14} ns={ns} aria-hidden />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {table.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: "auto", fontFamily: "ui-monospace, monospace" }}>
                    {list.length} fila{list.length === 1 ? "" : "s"}
                </Typography>
            </Stack>
            <Box
                sx={{
                    width: "100%",
                    overflowX: "auto",
                    borderRadius: 1,
                    border: `1px solid ${c.border}`,
                    background: c.preBg,
                }}
            >
                <Box
                    component="table"
                    sx={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontFamily: "ui-monospace, monospace",
                        fontSize: "0.78rem",
                    }}
                >
                    <Box component="thead" sx={{ background: c.dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}>
                        <Box component="tr">
                            {table.columns.map((col) => (
                                <Box
                                    component="th"
                                    key={col.key}
                                    sx={{
                                        textAlign: col.align || "left",
                                        p: 0.75,
                                        fontWeight: 700,
                                        fontSize: "0.7rem",
                                        letterSpacing: 0.4,
                                        textTransform: "uppercase",
                                        color: "text.secondary",
                                        borderBottom: `1px solid ${c.border}`,
                                        width: col.width || undefined,
                                    }}
                                >
                                    {col.label}
                                </Box>
                            ))}
                        </Box>
                    </Box>
                    <Box component="tbody">
                        {list.map((row, i) => (
                            <Box
                                component="tr"
                                key={i}
                                sx={{
                                    "&:nth-of-type(even)": { background: c.dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" },
                                    "&:hover": { background: c.dark ? "rgba(168,85,247,0.08)" : "rgba(168,85,247,0.05)" },
                                }}
                            >
                                {table.columns.map((col) => (
                                    <Box
                                        component="td"
                                        key={col.key}
                                        sx={{
                                            textAlign: col.align || "left",
                                            p: 0.75,
                                            borderBottom: `1px solid ${c.border}`,
                                            whiteSpace: "nowrap",
                                            maxWidth: 320,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                        }}
                                    >
                                        {col.icon ? (
                                            <Tooltip arrow title={String(row[col.key] ?? "")}>
                                                <span>
                                                    <SwIcon icon={col.icon} size={12} ns={ns} aria-hidden /> {String(row[col.key] ?? "")}
                                                </span>
                                            </Tooltip>
                                        ) : (
                                            String(row[col.key] ?? "")
                                        )}
                                    </Box>
                                ))}
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}