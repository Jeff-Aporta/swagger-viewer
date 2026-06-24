/** Toast ISAFront + mensaje para Alert inline. */

export function notifyApiError(message, { severity = "error" } = {}) {
  const msg = String(message || "Error desconocido").trim() || "Error desconocido";
  try {
    const front = globalThis.ISAFront;
    const toast = front?.Feedback?.toast;
    if (toast?.error && severity === "error") toast.error(msg);
    else if (toast?.show) toast.show({ message: msg, severity });
    else if (front?.Toast?.show) front.Toast.show({ message: msg, severity });
    else if (typeof front?.showToast === "function") front.showToast({ message: msg, severity });
  } catch {
    /* ignore */
  }
  return msg;
}
