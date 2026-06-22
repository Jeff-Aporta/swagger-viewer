import { encodeQueryQ } from "../lib/filter/query-q.js";

const { useState, useEffect, useMemo } = React;
const {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
} = MaterialUI;

function defaultBag(ext) {
  return { ...(ext?.default || {}) };
}

function fieldDefs(ext) {
  const props = ext?.properties || ext?.schema || {};
  return Object.entries(props).map(([name, def]) => ({ name, def: def || {} }));
}

function coerceValue(def, raw) {
  const t = def.type || "string";
  if (t === "boolean") return !!raw;
  if (t === "integer" || t === "number") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : def.default ?? 0;
  }
  return raw ?? "";
}

export function QueryFiltersPanel({ ext, disabled, onChange }) {
  const fields = useMemo(() => fieldDefs(ext), [ext]);
  const [bag, setBag] = useState(() => defaultBag(ext));

  useEffect(() => {
    setBag(defaultBag(ext));
  }, [ext]);

  useEffect(() => {
    onChange?.(encodeQueryQ(bag));
  }, [bag, onChange]);

  function setField(name, value) {
    setBag((prev) => ({ ...prev, [name]: value }));
  }

  if (!fields.length) {
    return (
      <Typography variant="caption" color="text.secondary">
        Sin filtros definidos (x-iss-query-q).
      </Typography>
    );
  }

  return (
    <Box className="isa-sw-query-filters" sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.85 }}>
        Filtros empaquetados en <code>q</code> (JSON → base64url).
      </Typography>
      {fields.map(({ name, def }) => {
        const t = def.type || "string";
        if (t === "boolean") {
          return (
            <FormControlLabel
              key={name}
              control={
                <Switch
                  size="small"
                  disabled={disabled}
                  checked={!!bag[name]}
                  onChange={(e) => setField(name, e.target.checked)}
                />
              }
              label={def.description || name}
            />
          );
        }
        return (
          <TextField
            key={name}
            size="small"
            fullWidth
            disabled={disabled}
            type={t === "integer" || t === "number" ? "number" : "text"}
            label={def.description || name}
            value={bag[name] ?? def.default ?? ""}
            onChange={(e) => setField(name, coerceValue(def, e.target.value))}
            inputProps={{
              min: def.minimum,
              max: def.maximum,
              "aria-label": name,
            }}
          />
        );
      })}
    </Box>
  );
}
