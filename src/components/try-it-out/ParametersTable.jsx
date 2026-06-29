import { ParamLookupField } from "../filters/ParamLookupField.jsx";
import { IssFusedSelectField } from "../filters/IssFusedSelectField.jsx";
import { GlassTableWrap } from "../../lib/ui/glass.jsx";
import { paramInputMode, paramSchemaType, sanitizeParamInputValue } from "../../lib/openapi/param-schema.js";
import { resolveParamEnumOptions } from "../../lib/openapi/param-enum.js";
import {
  readOpParamFromUrl,
  subscribeOpParamsUrl,
  writeOpParamToUrl,
} from "../../lib/nav/operation-params-url.js";

const {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} = MaterialUI;

function pathParamsOnly(parameters) {
  return (parameters || []).filter((p) => p.in === "path");
}

function paramPlaceholder(p) {
  if (p.description) return p.description;
  if (p.example != null) return String(p.example);
  return "";
}

function paramTypeLabel(p) {
  return p.schema?.type || p.schema?.format || "—";
}

export function ParametersTable({ parameters = [], values, onChange, lookupIndex = {}, spec, opPath = "", catalogDocKeys = null, expandId = "", disabled, authEnabled, onNeedLogin }) {
  const pathParams = pathParamsOnly(parameters);
  if (!pathParams.length) return null;

  return (
    <GlassTableWrap className="isa-sw-params-wrap">
      <Table size="small" className="isa-sw-params-table isa-sw-params-table--compact">
        <TableHead>
          <TableRow>
            <TableCell className="isa-sw-param-col-name">Parámetro URL</TableCell>
            <TableCell className="isa-sw-param-col-type">Tipo</TableCell>
            <TableCell className="isa-sw-param-col-value">Valor</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pathParams.map((p) => {
            const name = p.name || "";
            const lookup = lookupIndex[name] || p["x-iss-lookup"];
            const typeLabel = paramTypeLabel(p);
            const schemaType = paramSchemaType(p.schema);
            const enumOpts = resolveParamEnumOptions(p, spec, opPath, catalogDocKeys);
            const persistParam = (v) => {
              onChange(name, v);
              if (expandId) writeOpParamToUrl(expandId, name, v);
            };
            return (
              <TableRow key={name} className="isa-sw-param-row">
                <TableCell className="isa-sw-param-name">
                  <Typography component="code" variant="body2" className="isa-sw-param-name__code">
                    {name}
                  </Typography>
                </TableCell>
                <TableCell className="isa-sw-param-type">{typeLabel}</TableCell>
                <TableCell className="isa-sw-param-value">
                  {lookup ? (
                    <ParamLookupField
                      lookup={lookup}
                      paramName={name}
                      schema={p.schema}
                      value={values[name] || ""}
                      onChange={persistParam}
                      disabled={disabled}
                      hideLabel
                      placeholder={paramPlaceholder(p)}
                      authEnabled={authEnabled}
                      onNeedLogin={onNeedLogin}
                    />
                  ) : enumOpts?.length ? (
                    <IssFusedSelectField
                      value={values[name] || ""}
                      options={enumOpts.map((v) => ({ value: String(v), label: String(v) }))}
                      onChange={(v) => persistParam(sanitizeParamInputValue(p.schema, v))}
                      disabled={disabled}
                      allowEmpty={!p.required}
                      placeholder="Elegir clave…"
                    />
                  ) : (
                    <TextField
                      size="small"
                      fullWidth
                      disabled={disabled}
                      value={values[name] || ""}
                      onChange={(e) => persistParam(sanitizeParamInputValue(p.schema, e.target.value))}
                      placeholder={paramPlaceholder(p)}
                      inputProps={{
                        "aria-label": name,
                        inputMode: paramInputMode(p.schema),
                        pattern: schemaType === "integer" ? "[0-9]*" : undefined,
                      }}
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </GlassTableWrap>
  );
}

export { pathParamsOnly };
