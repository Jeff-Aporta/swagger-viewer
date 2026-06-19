import { OperationCard } from "./OperationCard.jsx";
import { SwIcon } from "../lib/sw-icon.jsx";

const { Box, Typography, Chip } = MaterialUI;

export function OperationTagGroup({
  group,
  tagIndex = 0,
  spec,
  docIndex,
  lookupIndex,
  authEnabled,
  onNeedLogin,
  ns = "ISA",
}) {
  const ops = group?.operations || [];
  if (!ops.length) return null;

  return (
    <Box component="section" className="isa-sw-tag-group" sx={{ mb: 3 }}>
      <Box className="isa-sw-tag-head">
        <Box className="isa-sw-tag-head__icon" aria-hidden>
          <SwIcon icon="mdi:tag-outline" size={22} ns={ns} />
        </Box>
        <Box className="isa-sw-tag-head__text">
          <Typography component="span" className="isa-sw-tag-head__eyebrow" variant="overline">
            Categoría
          </Typography>
          <Typography component="h2" className="isa-sw-tag-head__title" variant="h6">
            {group.name}
          </Typography>
          {group.description ? (
            <Typography component="p" className="isa-sw-tag-head__desc" variant="caption" color="text.secondary">
              {group.description}
            </Typography>
          ) : null}
        </Box>
        <Chip
          className="isa-sw-tag-head__count"
          size="small"
          label={`${ops.length} endpoint${ops.length === 1 ? "" : "s"}`}
          variant="outlined"
        />
      </Box>
      <Box className="isa-sw-tag-group__ops">
        {ops.map((op, opIndex) => (
          <OperationCard
            key={`${group.name}-${op.operationId}`}
            tagIndex={tagIndex}
            opIndex={opIndex}
            op={op}
            spec={spec}
            docMd={docIndex[op.operationId]}
            lookupIndex={lookupIndex}
            authEnabled={authEnabled}
            onNeedLogin={onNeedLogin}
            ns={ns}
          />
        ))}
      </Box>
    </Box>
  );
}
