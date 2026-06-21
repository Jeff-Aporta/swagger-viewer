const { useState, useEffect, useCallback, useMemo, useRef } = React;
const { Autocomplete, TextField, Box, Typography, CircularProgress, InputAdornment } = MaterialUI;

import { getStoredJwt } from "../lib/auth.js";
import { fetchApiJson } from "../lib/api-fetch.js";
import { resolveLookupRequestUrl } from "../lib/server-base.js";
import { formatLookupLabel, lookupLabelParts, lookupLabelSeparator } from "../lib/lookup-label.js";
import { extractLookupRows } from "../lib/lookup-rows.js";
import { useServerBase } from "../context/ServerBaseContext.jsx";
import { sanitizeParamInputValue, paramInputMode, paramSchemaType } from "../lib/param-schema.js";
import { createDelayer, LOOKUP_SEARCH_DELAY_MS } from "../lib/delayer.js";
import { HttpErrorAlert } from "./HttpErrorAlert.jsx";
import { recommendationSampleRequest } from "../lib/input-recommendation.js";

function mapLookupRows(rows, lookup, session) {
  return rows.map((row) => ({
    id: String(row[lookup.valueField || "id"] ?? ""),
    label: formatLookupLabel(row, lookup, session),
    labelParts: lookupLabelParts(row, lookup, session),
    meta: row,
  }));
}

const LOADING_OPTION = Object.freeze({ id: "__isa_sw_lookup_loading__", loading: true });

function LookupOptionLabel({ parts, lookup }) {
  if (!parts?.length) return null;
  if (parts.length === 1) return parts[0];
  const sep = lookupLabelSeparator(lookup);
  return parts.map((part, i) => (
    <React.Fragment key={i}>
      {i > 0 ? (
        <span className="isa-sw-lookup-sep" aria-hidden="true">
          {sep}
        </span>
      ) : null}
      {part}
    </React.Fragment>
  ));
}

export function ParamLookupField({
  lookup,
  paramName,
  schema,
  value,
  onChange,
  disabled,
  hideLabel,
  placeholder,
  authEnabled = false,
  onNeedLogin,
}) {
  const { serverBase } = useServerBase();
  const displayLimit = lookup?.displayLimit ?? 10;
  const schemaType = paramSchemaType(schema);
  const numericOnly = schemaType === "integer" || schemaType === "number";
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState(value || "");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const requiresAuth = authEnabled && lookup?.requiresAuth !== false;
  const delayerRef = useRef(null);
  const wantOpenRef = useRef(false);
  const searchGenRef = useRef(0);
  if (!delayerRef.current) delayerRef.current = createDelayer(LOOKUP_SEARCH_DELAY_MS);

  function closeList() {
    wantOpenRef.current = false;
    searchGenRef.current += 1;
    setListOpen(false);
    setPending(false);
    delayerRef.current?.cancel();
  }

  function openList() {
    wantOpenRef.current = true;
    setListOpen(true);
  }

  useEffect(() => () => delayerRef.current?.cancel(), []);

  useEffect(() => {
    setInput(value || "");
  }, [value]);

  const search = useCallback(
    async (q) => {
      const url = resolveLookupRequestUrl(lookup, serverBase, q);
      if (!url) return;
      const gen = ++searchGenRef.current;
      if (requiresAuth && !getStoredJwt()?.token) {
        setError("Inicia sesión para buscar valores en la API.");
        setOptions([]);
        closeList();
        setPending(false);
        return;
      }
      setLoading(true);
      setError("");
      setOptions([]);
      try {
        const { data } = await fetchApiJson(url, {
          errorHint: "Si el mensaje menciona GetConnection, la base de datos no está accesible. Revisa GET /health.",
        });
        if (gen !== searchGenRef.current) return;
        const rows = extractLookupRows(data, lookup);
        const mapped = mapLookupRows(rows, lookup, getStoredJwt()).slice(0, displayLimit);
        setOptions(mapped);
        if (wantOpenRef.current) setListOpen(true);
      } catch (e) {
        if (gen !== searchGenRef.current) return;
        setError(e.message || String(e));
        setOptions([]);
        if (wantOpenRef.current) setListOpen(true);
      } finally {
        if (gen === searchGenRef.current) {
          setLoading(false);
          setPending(false);
        }
      }
    },
    [lookup, serverBase, requiresAuth, displayLimit],
  );

  const queueSearch = useCallback(
    (q, { immediate = false } = {}) => {
      if (!wantOpenRef.current) return;
      const trimmed = String(q ?? "").trim();
      setPending(true);
      const run = () => search(trimmed);
      if (immediate || !trimmed) {
        delayerRef.current?.cancel();
        run();
      } else {
        delayerRef.current.isReady(run);
      }
    },
    [search],
  );

  const showLoading = loading || pending;
  const displayOptions = showLoading ? [LOADING_OPTION] : options;

  const listboxMaxHeight = useMemo(() => Math.min(displayLimit, 10) * 36 + 8, [displayLimit]);
  const noOptionsText = String(input ?? "").trim() ? "Sin coincidencias" : "Sin conversaciones recientes";

  if (!lookup) return null;

  const sample = recommendationSampleRequest(lookup, serverBase);

  function onFocusField() {
    setTouched(true);
    if (requiresAuth && !getStoredJwt()?.token) {
      onNeedLogin?.("Inicia sesión para usar el buscador de conversaciones.");
    }
  }

  return (
    <Box className="isa-sw-param-lookup" sx={{ maxWidth: "100%" }}>
      <Autocomplete
        size="small"
        freeSolo
        disabled={disabled}
        loading={false}
        open={listOpen}
        onOpen={() => {
          onFocusField();
          openList();
          const trimmed = String(input ?? "").trim();
          queueSearch(trimmed, { immediate: !trimmed });
        }}
        onClose={() => closeList()}
        openOnFocus
        blurOnSelect
        options={displayOptions}
        filterOptions={(opts) => opts}
        noOptionsText={noOptionsText}
        inputValue={input}
        onInputChange={(_e, v, reason) => {
          // MUI emite "reset" con la etiqueta completa al elegir — el input debe quedar solo con el id (onChange).
          if (reason === "reset") return;
          if (reason === "clear") {
            setInput("");
            onChange("");
            openList();
            queueSearch("", { immediate: true });
            return;
          }
          if (reason === "input") {
            setTouched(true);
            openList();
            searchGenRef.current += 1;
            delayerRef.current?.cancel();
            setPending(true);
            setOptions([]);
            const next = sanitizeParamInputValue(schema, v);
            setInput(next);
            onChange(next);
            queueSearch(next);
          }
        }}
        onChange={(_e, opt) => {
          if (opt?.loading) return;
          searchGenRef.current += 1;
          closeList();
          if (opt == null) {
            setInput("");
            onChange("");
            return;
          }
          const id = typeof opt === "string" ? opt : opt?.id || "";
          setInput(id);
          onChange(id);
        }}
        getOptionLabel={(o) => (o?.loading ? "" : typeof o === "string" ? o : o.id || "")}
        getOptionDisabled={(o) => !!o?.loading}
        renderOption={(props, option) => {
          const { key, ...rest } = props;
          if (option.loading) {
            return (
              <li key={key} {...rest} className={`${rest.className || ""} isa-sw-lookup-option isa-sw-lookup-option--loading`.trim()} aria-live="polite">
                <CircularProgress color="inherit" size={14} thickness={5} aria-hidden="true" />
                <span>Buscando conversaciones…</span>
              </li>
            );
          }
          return (
            <li key={key} {...rest} className={`${rest.className || ""} isa-sw-lookup-option`.trim()}>
              <LookupOptionLabel parts={option.labelParts} lookup={lookup} />
            </li>
          );
        }}
        isOptionEqualToValue={(o, v) =>
          o?.loading || v?.loading ? false : (typeof o === "string" ? o : o.id) === (typeof v === "string" ? v : v?.id)
        }
        ListboxProps={{ style: { maxHeight: listboxMaxHeight } }}
        renderInput={(params) => {
          const inputProps = params.InputProps || {};
          return (
          <TextField
            {...params}
            onFocus={onFocusField}
            placeholder={placeholder || lookup.placeholder || lookup.hint || ""}
            label={hideLabel ? undefined : lookup.label || paramName}
            inputProps={{
              ...(params.inputProps || {}),
              ...(hideLabel ? { "aria-label": paramName } : null),
              inputMode: numericOnly ? paramInputMode(schema) : params.inputProps?.inputMode,
              pattern: schemaType === "integer" ? "[0-9]*" : params.inputProps?.pattern,
            }}
            InputProps={{
              ...inputProps,
              endAdornment: (
                <>
                  {showLoading ? (
                    <InputAdornment position="end" className="isa-sw-lookup-loading">
                      <CircularProgress color="inherit" size={16} thickness={5} aria-label="Buscando conversaciones" />
                    </InputAdornment>
                  ) : null}
                  {inputProps.endAdornment}
                </>
              ),
            }}
          />
          );
        }}
      />
      {lookup.hint ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
          {lookup.hint}
        </Typography>
      ) : null}
      {sample ? (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ display: "block", mt: 0.25, fontFamily: "ui-monospace, monospace", fontSize: "0.72rem", wordBreak: "break-all" }}>
          {sample.method} {sample.url.replace(/^https?:\/\/[^/]+/i, "")}
        </Typography>
      ) : null}
      {error ? (
        <Box sx={{ mt: 0.5 }}>
          <HttpErrorAlert severity="error" message={error} />
        </Box>
      ) : null}
    </Box>
  );
}
