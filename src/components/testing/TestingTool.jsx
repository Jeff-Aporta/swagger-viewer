/**
 * Dispatcher de tools declarativas. Lee `tool.id` y monta el componente
 * correspondiente. Si el id no está registrado, muestra fallback.
 */
const MaterialUI = globalThis.MaterialUI;
import { SwIcon } from "../../lib/ui/sw-icon.jsx";
import { TestingTimeline } from "./TestingTimeline.jsx";
import { TestingHistogram } from "./TestingHistogram.jsx";
import { TestingTable } from "./TestingTable.jsx";
import { useGlassColors } from "../../lib/ui/glass.jsx";

const { Box, Typography } = MaterialUI;

export function TestingTool({ tool, data, ns = "ISS" }) {
    const c = useGlassColors();
    if (!tool || !tool.id) return null;
    if (tool.id === "timeline") {
        return <TestingTimeline changes={data?.items ?? []} totalMessages={data?.total ?? 0} ns={ns} />;
    }
    if (tool.id === "histogram") {
        return <TestingHistogram data={data} ns={ns} />;
    }
    if (tool.id === "table") {
        return <TestingTable table={tool.table} rows={data?.rows ?? []} ns={ns} />;
    }
    return (
        <Box sx={{ p: 1.5, border: `1px dashed ${c.border}`, borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
                <SwIcon icon={tool.icon} size={12} ns={ns} /> Tool <code>{tool.id}</code> no registrada.
            </Typography>
        </Box>
    );
}