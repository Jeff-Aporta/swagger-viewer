/** Select estático con el mismo Autocomplete fusionado (sin backdrop de Menu). */

import { autocompleteFusedClassName, autocompleteFusedSlotProps } from "../../lib/ui/autocomplete-fused.js";

const { useState } = React;
const { Autocomplete, TextField } = MaterialUI;

const EMPTY_OPTION = Object.freeze({ value: "", label: "(vacío)" });

function matchOption(options, value) {
  if (value === "" || value == null) return EMPTY_OPTION;
  return options.find((o) => String(o.value) === String(value)) ?? null;
}

export function IssFusedSelectField({ label, value, options, onChange, disabled, helperText, emptyLabel = "(vacío)", allowEmpty = true, placeholder = "" }) {
  const [open, setOpen] = useState(false);
  const allOptions = !allowEmpty || options[0]?.value === "" ? options : [{ value: "", label: emptyLabel }, ...options];
  const selected = matchOption(allOptions, value);

  return (
    <Autocomplete
      className={autocompleteFusedClassName(open)}
      slotProps={autocompleteFusedSlotProps(open)}
      size="small"
      fullWidth
      disabled={disabled}
      disableClearable
      openOnFocus
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={allOptions}
      value={selected}
      onChange={(_, opt) => onChange?.(opt?.value ?? "")}
      getOptionLabel={(o) => o?.label ?? String(o?.value ?? "")}
      isOptionEqualToValue={(a, b) => String(a?.value) === String(b?.value)}
      renderInput={(params) => {
        const inputProps = params.InputProps || {};
        return <TextField {...params} label={label} helperText={helperText} placeholder={placeholder} InputProps={inputProps} onClick={() => !disabled && setOpen(true)} />;
      }}
    />
  );
}
