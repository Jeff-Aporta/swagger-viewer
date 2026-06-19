const { useState, useEffect, useCallback } = React;
const {
  Autocomplete,
  TextField,
  Box,
  Typography,
} = MaterialUI;

export function ParamLookupField({ lookup, paramName, value, onChange, disabled, hideLabel, placeholder }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState(value || "");
  const [error, setError] = useState("");

  useEffect(() => {
    setInput(value || "");
  }, [value]);

  const search = useCallback(
    async (q) => {
      if (!lookup?.url) return;
      setLoading(true);
      setError("");
      try {
        const url = lookup.url.replace("{q}", encodeURIComponent(q || ""));
        const headers = { Accept: "application/json" };
        const jwt = globalThis.__isaSwaggerJwt?.();
        if (jwt) headers.Authorization = `Bearer ${jwt}`;
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const rows = lookup.itemsPath
          ? data[lookup.itemsPath] || data.items || data.rows || []
          : Array.isArray(data)
            ? data
            : data.items || [];
        setOptions(
          rows.map((row) => ({
            id: String(row[lookup.valueField || "id"] ?? ""),
            label: String(row[lookup.labelField || lookup.valueField || "id"] ?? ""),
            meta: row,
          })),
        );
      } catch (e) {
        setError(e.message || String(e));
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [lookup],
  );

  useEffect(() => {
    const t = setTimeout(() => search(input), 280);
    return () => clearTimeout(t);
  }, [input, search]);

  if (!lookup) return null;

  return (
    <Box className="isa-sw-param-lookup" sx={{ maxWidth: "100%" }}>
      <Autocomplete
        size="small"
        freeSolo
        disabled={disabled}
        loading={loading}
        options={options}
        inputValue={input}
        onInputChange={(_e, v) => {
          setInput(v);
          onChange(v);
        }}
        onChange={(_e, opt) => {
          const id = typeof opt === "string" ? opt : opt?.id || "";
          setInput(id);
          onChange(id);
        }}
        getOptionLabel={(o) => (typeof o === "string" ? o : o.label || o.id || "")}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder || lookup.placeholder || lookup.hint || ""}
            label={hideLabel ? undefined : lookup.label || paramName}
            inputProps={hideLabel ? { "aria-label": paramName } : undefined}
          />
        )}
      />
      {lookup.hint ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
          {lookup.hint}
        </Typography>
      ) : null}
      {error ? (
        <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.25 }}>
          {error}
        </Typography>
      ) : null}
    </Box>
  );
}
