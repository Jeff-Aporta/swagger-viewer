function elapsed(since) {
  if (since < 0) return Number.POSITIVE_INFINITY;
  return Date.now() - since;
}

/** Espacia ejecuciones: acumula callbacks y ejecuta el último cuando pasó `timedelay` ms desde la anterior. */
export function createDelayer(timedelay) {
  let delay = -1;
  let pila = [];
  let equilibrio = 0;
  let timer = null;

  const api = {
    setDelay(newTimedelay) {
      timedelay = newTimedelay;
    },

    getDelay() {
      return timedelay;
    },

    isReady(cbIncrement) {
      const ready = elapsed(delay) >= timedelay;
      if (cbIncrement) pila.push(cbIncrement);
      if (ready) {
        if (pila.length) {
          if (equilibrio === 0) {
            delay = Date.now();
            pila.pop()();
            pila = [];
          }
        } else {
          delay = Date.now();
        }
      } else if (cbIncrement) {
        equilibrio++;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = null;
          equilibrio--;
          api.isReady();
        }, timedelay);
      }
      return ready;
    },

    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      pila = [];
      equilibrio = 0;
    },
  };

  return api;
}

export const LOOKUP_SEARCH_DELAY_MS = 500;
