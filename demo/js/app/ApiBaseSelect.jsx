import { normalizeApiBase, inferSwaggerUrls } from "../../../src/lib/api/swagger-api.js";

import { DEMO_API_SCOPES } from "../../../src/lib/lookup/server-scopes.js";

import { ServerScopeSelect } from "../../../src/components/ServerScopeSelect.jsx";

import { SwIcon } from "../../../src/lib/ui/sw-icon.jsx";



const { Box, Button, Typography, Tooltip, Chip, Stack } = MaterialUI;



const LS_KEY = "isa-sw-demo-api-base";



export function readStoredApiBase() {

  try {

    const saved = normalizeApiBase(localStorage.getItem(LS_KEY) || "");

    if (saved) return saved;

  } catch {

    /* ignore */

  }

  return normalizeApiBase(DEMO_API_SCOPES[0]?.base || "");

}



export function storeApiBase(base) {

  try {

    const n = normalizeApiBase(base);

    if (n) localStorage.setItem(LS_KEY, n);

    else localStorage.removeItem(LS_KEY);

    return n;

  } catch {

    return normalizeApiBase(base);

  }

}



/** Selector de base API — scopes del JSON + URL libre; infiere GET/PUT swagger. */

export function ApiBaseSelect({ value, onChange, onConnect, busy, ns = "ISA", scopes }) {

  const urls = inferSwaggerUrls(value);

  const scopeList = scopes?.length ? scopes : DEMO_API_SCOPES;



  return (

    <Box className="isa-sw-demo__api-base" sx={{ px: 1.5, py: 1, flexShrink: 0, borderBottom: 1, borderColor: "divider" }}>

      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>

        <ServerScopeSelect value={value} onChange={onChange} scopes={scopeList} ns={ns} />

        <Tooltip title="GET público /swagger/config.json" arrow>

          <Button size="small" variant="contained" disabled={!value?.trim() || busy} onClick={() => onConnect?.()} startIcon={<SwIcon icon="mdi:lan-connect" size={18} ns={ns} />}>

            Conectar

          </Button>

        </Tooltip>

      </Stack>

      {urls.get ? (

        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.75, display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>

          <Chip size="small" label={`GET ${urls.config}`} variant="outlined" color="info" />
          <Chip size="small" label={`PUT ${urls.put}`} variant="outlined" color="warning" />

        </Typography>

      ) : null}

    </Box>

  );

}


