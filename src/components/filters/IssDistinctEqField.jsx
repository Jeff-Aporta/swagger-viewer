/** Autocomplete eq con DISTINCT sobre listado ISS (query f). */

import { canRunIssLookup } from "../../lib/lookup/lookup-auth.js";
import { fetchApiJson } from "../../lib/http/api-fetch.js";
import { buildDistinctLookupUrl } from "../../lib/lookup/server-base.js";
import { extractLookupRows } from "../../lib/lookup/lookup-rows.js";
import { useServerBase } from "../../context/ServerBaseContext.jsx";
import { createDelayer, LOOKUP_SEARCH_DELAY_MS } from "../../lib/ui/delayer.js";
import { LOOKUP_SEARCH_LIMIT } from "../../lib/filter/iss-list-filter.js";
import { SwIcon } from "../../lib/ui/sw-icon.jsx";
import { autocompleteFusedClassName, autocompleteFusedSlotProps } from "../../lib/ui/autocomplete-fused.js";

const { useState, useEffect, useCallback, useRef, useMemo } = React;
const { Autocomplete, TextField, Box, CircularProgress } = MaterialUI;

const LOADING_OPTION = Object.freeze({ id: "__loading__", loading: true });

function rowLabel(row, columns, distinctLookup, sep = " | ") {
  const base = columns.map((c) => String(row?.[c] ?? "")).filter(Boolean).join(sep);
  const nickField = distinctLookup?.ownerNickField || "nick_propietario";
  const nick = String(row?.[nickField] ?? "").trim();
  if (nick && nick !== String(row?.icontacto ?? "").trim()) return `${base} — ${nick}`;
  return base || "(vacío)";
}

function rowKey(row, columns) {
  return columns.map((c) => String(row?.[c] ?? "")).join("\0");
}

export function IssDistinctCompoundEqField({
  listPath,
  distinctLookup,
  fields,
  values,
  onApply,
  disabled,
  ns = "ISA",
  authEnabled,
}) {
  const columns = distinctLookup?.columns || [];
  const { serverBase } = useServerBase();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const delayerRef = useRef(null);
  const genRef = useRef(0);
  if (!delayerRef.current) delayerRef.current = createDelayer(LOOKUP_SEARCH_DELAY_MS);

  const displayValue = useMemo(() => {
    const parts = columns.map((c) => values?.[c]).filter((v) => v != null && String(v).length);
    return parts.length ? columns.map((c) => String(values[c] ?? "")).join(" | ") : "";
  }, [values, columns]);

  const search = useCallback(
    async (q) => {
      if (!canRunIssLookup(authEnabled)) {
        setOptions([]);
        setPending(false);
        setLoading(false);
        return;
      }
      const url = buildDistinctLookupUrl(serverBase, listPath, {
        columns,
        search: q,
        limit: LOOKUP_SEARCH_LIMIT,
      });
      if (!url) return;
      const gen = ++genRef.current;
      setLoading(true);
      try {
        const { data } = await fetchApiJson(url);
        if (gen !== genRef.current) return;
        const rows = extractLookupRows(data, { itemsPath: "conversaciones" });
        const mapped = rows.map((row) => ({
          id: rowKey(row, columns),
          label: rowLabel(row, columns, distinctLookup),
          row,
        }));
        setOptions(mapped);
      } catch {
        if (gen === genRef.current) setOptions([]);
      } finally {
        if (gen === genRef.current) {
          setLoading(false);
          setPending(false);
        }
      }
    },
    [serverBase, listPath, columns, authEnabled],
  );

  useEffect(() => {
    setInput(displayValue);
  }, [displayValue]);

  function queueSearch(q, immediate = false) {
    if (!canRunIssLookup(authEnabled)) return;
    setPending(true);
    const run = () => search(q);
    if (immediate) {
      delayerRef.current?.cancel();
      run();
    } else {
      delayerRef.current.isReady(run);
    }
  }

  const label = fields.map((f) => f.def?.label || f.key).join(" · ");
  const showOpts = loading || pending ? [LOADING_OPTION] : options;

  return (
    <Autocomplete
      className={autocompleteFusedClassName(open)}
      slotProps={autocompleteFusedSlotProps(open)}
      size="small"
      freeSolo
      disabled={disabled}
      open={open}
      onOpen={() => {
        if (!canRunIssLookup(authEnabled)) return;
        setOpen(true);
        queueSearch(String(input ?? "").trim(), !String(input ?? "").trim());
      }}
      onClose={() => setOpen(false)}
      options={showOpts}
      filterOptions={(o) => o}
      getOptionLabel={(o) => (o.loading ? "Buscando…" : o.label || "")}
      isOptionEqualToValue={(a, b) => a?.id === b?.id}
      inputValue={input}
      onInputChange={(_, v, reason) => {
        setInput(v);
        if (reason === "input") queueSearch(v);
      }}
      onChange={(_, opt) => {
        if (!opt || opt.loading) return;
        const patch = {};
        for (const col of columns) patch[col] = opt.row?.[col] ?? "";
        onApply?.(patch);
        setInput(opt.label || "");
      }}
      renderInput={(params) => {
        const inputProps = params.InputProps || {};
        return (
        <TextField
          {...params}
          label={label}
          placeholder="Buscar…"
          helperText={distinctLookup?.hint || "Valores distintos del listado"}
          InputProps={{
            ...inputProps,
            endAdornment: (
              <>
                {(loading || pending) ? <CircularProgress size={16} /> : null}
                {inputProps.endAdornment}
              </>
            ),
          }}
        />
        );
      }}
      renderOption={(props, opt) =>
        opt.loading ? (
          <Box component="li" {...props} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <CircularProgress size={14} />
            Buscando…
          </Box>
        ) : (
          <Box component="li" {...props}>
            {opt.label}
          </Box>
        )
      }
    />
  );
}

export function IssDistinctEqField({
  listPath,
  fieldKey,
  distinctLookup,
  def,
  value,
  onChange,
  disabled,
  ns = "ISA",
  authEnabled,
}) {
  const columns = distinctLookup?.columns || [fieldKey];
  const searchField = distinctLookup?.searchField || fieldKey;
  const { serverBase } = useServerBase();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value || "");
  const delayerRef = useRef(null);
  const genRef = useRef(0);
  if (!delayerRef.current) delayerRef.current = createDelayer(LOOKUP_SEARCH_DELAY_MS);

  useEffect(() => {
    setInput(value || "");
  }, [value]);

  const search = useCallback(
    async (q) => {
      if (!canRunIssLookup(authEnabled)) {
        setOptions([]);
        setPending(false);
        setLoading(false);
        return;
      }
      const url = buildDistinctLookupUrl(serverBase, listPath, {
        columns,
        search: q,
        searchField,
        limit: LOOKUP_SEARCH_LIMIT,
      });
      if (!url) return;
      const gen = ++genRef.current;
      setLoading(true);
      try {
        const { data } = await fetchApiJson(url);
        if (gen !== genRef.current) return;
        const rows = extractLookupRows(data, { itemsPath: "conversaciones" });
        const col = columns[0];
        const seen = new Set();
        const mapped = [];
        for (const row of rows) {
          const v = String(row?.[col] ?? "");
          if (!v || seen.has(v)) continue;
          seen.add(v);
          mapped.push({ id: v, label: v });
        }
        setOptions(mapped);
      } catch {
        if (gen === genRef.current) setOptions([]);
      } finally {
        if (gen === genRef.current) {
          setLoading(false);
          setPending(false);
        }
      }
    },
    [serverBase, listPath, columns, searchField, authEnabled],
  );

  function queueSearch(q, immediate = false) {
    if (!canRunIssLookup(authEnabled)) return;
    setPending(true);
    const run = () => search(q);
    if (immediate) {
      delayerRef.current?.cancel();
      run();
    } else {
      delayerRef.current.isReady(run);
    }
  }

  const showOpts = loading || pending ? [LOADING_OPTION] : options;

  return (
    <Autocomplete
      className={autocompleteFusedClassName(open)}
      slotProps={autocompleteFusedSlotProps(open)}
      size="small"
      freeSolo
      disabled={disabled}
      open={open}
      onOpen={() => {
        if (!canRunIssLookup(authEnabled)) return;
        setOpen(true);
        queueSearch(String(input ?? "").trim(), !String(input ?? "").trim());
      }}
      onClose={() => setOpen(false)}
      options={showOpts}
      filterOptions={(o) => o}
      getOptionLabel={(o) => (o.loading ? "Buscando…" : o.label || String(o))}
      isOptionEqualToValue={(a, b) => String(a?.id ?? a) === String(b?.id ?? b)}
      value={value || ""}
      inputValue={input}
      onInputChange={(_, v, reason) => {
        setInput(v);
        onChange?.(v);
        if (reason === "input") queueSearch(v);
      }}
      onChange={(_, opt) => {
        if (!opt || opt.loading) return;
        const v = opt.id ?? opt.label ?? "";
        onChange?.(v);
        setInput(String(v));
      }}
      renderInput={(params) => {
        const inputProps = params.InputProps || {};
        return (
        <TextField
          {...params}
          label={def?.label || fieldKey}
          helperText={def?.description || ""}
          InputProps={{
            ...inputProps,
            endAdornment: (
              <>
                {(loading || pending) ? <CircularProgress size={16} /> : null}
                {inputProps.endAdornment}
              </>
            ),
          }}
        />
        );
      }}
      renderOption={(props, opt) =>
        opt.loading ? (
          <Box component="li" {...props} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <CircularProgress size={14} />
            Buscando…
          </Box>
        ) : (
          <Box component="li" {...props}>
            {opt.label}
          </Box>
        )
      }
    />
  );
}
