import { ParamLookupField } from "./ParamLookupField.jsx";
import { GlassTableWrap } from "../lib/glass.jsx";

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

export function ParametersTable({ parameters = [], values, onChange, lookupIndex = {}, disabled }) {
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
                      value={values[name] || ""}
                      onChange={(v) => onChange(name, v)}
                      disabled={disabled}
                      hideLabel
                      placeholder={paramPlaceholder(p)}
                    />
                  ) : (
                    <TextField
                      size="small"
                      fullWidth
                      disabled={disabled}
                      value={values[name] || ""}
                      onChange={(e) => onChange(name, e.target.value)}
                      placeholder={paramPlaceholder(p)}
                      inputProps={{ "aria-label": name }}
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
