/** Input + listbox Autocomplete como un solo bloque (sin redondeo en la unión). */

const ROOT = "isa-sw-autocomplete-fused";
const PAPER = `${ROOT}__paper`;

export function autocompleteFusedClassName(open) {
  return open ? `${ROOT} ${ROOT}--open` : ROOT;
}

export function autocompleteFusedSlotProps(open) {
  const paperClass = open ? `${PAPER} ${PAPER}--open` : PAPER;
  if (!open) return { paper: { className: paperClass } };
  return {
    paper: { className: paperClass },
    popper: {
      className: `${ROOT}__popper ${ROOT}__popper--open`,
      modifiers: [{ name: "offset", options: { offset: [0, 0] } }],
    },
  };
}
