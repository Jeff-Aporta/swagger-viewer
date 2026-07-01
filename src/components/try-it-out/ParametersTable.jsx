import { ParamLookupField } from "../filters/ParamLookupField.jsx";
import { IssFusedSelectField } from "../filters/IssFusedSelectField.jsx";
import { GlassTableWrap } from "../../lib/ui/glass.jsx";
import { paramInputMode, paramSchemaType, sanitizeParamInputValue } from "../../lib/openapi/param-schema.js";

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
  if (p.schema?.enum?.length) return "enum";
  return p.schema?.type || p.schema?.format || "—";
}

function paramEnumOptions(p) {
  const labels = p.schema?.enumLabels;
  return (p.schema?.enum || []).map((opt) => {
    const value = String(opt);
    return { value, label: labels?.[opt] ?? labels?.[value] ?? value };
  });
}

export function ParametersTable({ parameters = [], values, onChange, lookupIndex = {}, disabled, authEnabled, onNeedLogin }) {
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
            const enumOptions = paramEnumOptions(p);
            const typeLabel = paramTypeLabel(p);
            const schemaType = paramSchemaType(p.schema);
            return (
              <TableRow key={name} className="isa-sw-param-row">
                <TableCell className="isa-sw-param-name">
                  <Typography component="code" variant="body2" className="isa-sw-param-name__code">
                    {name}
                  </Typography>
                </TableCell>
                <TableCell className="isa-sw-param-type">{typeLabel}</TableCell>
                <TableCell className="isa-sw-param-value">
                  {enumOptions.length ? (
                    <IssFusedSelectField
                      value={values[name] || ""}
                      onChange={(v) => onChange(name, v)}
                      disabled={disabled}
                      allowEmpty={!p.required}
                      options={enumOptions}
                      emptyLabel={paramPlaceholder(p) || "(elegir clave)"}
                    />
                  ) : lookup ? (
                    <ParamLookupField
                      lookup={lookup}
                      paramName={name}
                      schema={p.schema}
                      value={values[name] || ""}
                      onChange={(v) => onChange(name, v)}
                      disabled={disabled}
                      hideLabel
                      placeholder={paramPlaceholder(p)}
                      authEnabled={authEnabled}
                      onNeedLogin={onNeedLogin}
                    />
                  ) : (
                    <TextField
                      size="small"
                      fullWidth
                      disabled={disabled}
                      value={values[name] || ""}
                      onChange={(e) => onChange(name, sanitizeParamInputValue(p.schema, e.target.value))}
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
