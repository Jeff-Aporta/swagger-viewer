import { SwIcon } from "../lib/ui/sw-icon.jsx";
import { deriveSubgroupAccent } from "../lib/ui/tag-theme.js";

const { Box, Typography } = MaterialUI;

/** Cabecera de subcategoría — visual distinta al tag principal (más compacta, borde punteado). */
export function OperationSubGroup({ subgroup, tagAccent, children, ns = "ISA" }) {
  const ops = subgroup?.operations || [];
  if (!ops.length) return null;

  const icon = subgroup.icon || "mdi:folder-outline";
  const subgroupAccent = deriveSubgroupAccent(tagAccent);

  return (
    <Box
      component="div"
      className="isa-sw-subgroup"
      sx={{
        "--isa-sw-tag-accent": tagAccent,
        "--isa-sw-subgroup-accent": subgroupAccent,
      }}
    >
      <Box className="isa-sw-subgroup-head">
        <Box className="isa-sw-subgroup-head__icon" aria-hidden>
          <SwIcon icon={icon} size={18} ns={ns} />
        </Box>
        <Box className="isa-sw-subgroup-head__text">
          <Typography component="h3" className="isa-sw-subgroup-head__title" variant="subtitle2">
            {subgroup.name}
          </Typography>
          {subgroup.description ? (
            <Typography component="p" className="isa-sw-subgroup-head__desc" variant="caption" color="text.secondary">
              {subgroup.description}
            </Typography>
          ) : null}
        </Box>
      </Box>
      <Box className="isa-sw-subgroup__ops">{children}</Box>
    </Box>
  );
}
