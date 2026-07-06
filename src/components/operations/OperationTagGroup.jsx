import { OperationCard } from "./OperationCard.jsx";
import { OperationSubGroup } from "./OperationSubGroup.jsx";
import { SwIcon } from "../../lib/ui/sw-icon.jsx";
import { resolveTagTheme } from "../../lib/ui/tag-theme.js";

const { Box, Typography, Chip } = MaterialUI;

export function OperationTagGroup({
  group,
  tagIndex = 0,
  spec,
  docIndex,
  lookupIndex,
  catalogDocKeys,
  authEnabled,
  onNeedLogin,
  ns = "ISA",
}) {
  const ops = group?.operations || [];
  if (!ops.length) return null;

  const tagTheme = resolveTagTheme(group.name, group.meta);
  const subgroups = group.subgroups || [];
  const useSubgroups = subgroups.length > 0;

  let opCounter = 0;

  const renderOp = (op) => {
    const opIndex = opCounter++;
    return (
      <OperationCard
        key={`${group.name}-${op.operationId}-${op.method}-${op.path}`}
        tagIndex={tagIndex}
        opIndex={opIndex}
        op={op}
        spec={spec}
        docMd={docIndex[op.operationId]}
        lookupIndex={lookupIndex}
        catalogDocKeys={catalogDocKeys}
        authEnabled={authEnabled}
        onNeedLogin={onNeedLogin}
        ns={ns}
      />
    );
  };

  return (
    <Box
      component="section"
      className="isa-sw-tag-group"
      sx={{ mb: 3, mt: tagIndex === 0 ? 3 : 0, "--isa-sw-tag-accent": tagTheme.accent }}
    >
      <Box className="isa-sw-tag-head">
        <Box className="isa-sw-tag-head__icon" aria-hidden>
          <SwIcon icon={tagTheme.icon} size={22} ns={ns} />
        </Box>
        <Box className="isa-sw-tag-head__text">
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
          className="isa-sw-chip isa-sw-tag-head__count"
          size="small"
          label={`${ops.length} endpoint${ops.length === 1 ? "" : "s"}`}
          variant="outlined"
        />
      </Box>
      <Box className="isa-sw-tag-group__ops">
        {useSubgroups
          ? subgroups.map((sub) => (
              <OperationSubGroup key={sub.id} subgroup={sub} tagAccent={tagTheme.accent} ns={ns}>
                {sub.operations.map((op) => renderOp(op))}
              </OperationSubGroup>
            ))
          : ops.map((op) => renderOp(op))}
      </Box>
    </Box>
  );
}
