import { initSwaggerExpandUrlState } from "../lib/swagger-url-state.js";
import { isOpenDerived, scrollToExpandId, toggleInStack } from "../lib/expand-stack.js";

const { createContext, useContext, useEffect, useMemo, useRef, useState } = React;

const ExpandStackContext = createContext(null);

export function ExpandStackProvider({ children }) {
  const apiRef = useRef(null);
  const [stack, setStack] = useState([]);
  const [localStack, setLocalStack] = useState([]);
  const [hasApi, setHasApi] = useState(false);
  const scrolledRef = useRef(false);

  useEffect(() => {
    const api = initSwaggerExpandUrlState();
    apiRef.current = api;
    if (api) {
      setHasApi(true);
      setStack(api.getOpenStack());
      return api.subscribe(() => setStack(api.getOpenStack()));
    }
    return undefined;
  }, []);

  const activeStack = hasApi ? stack : localStack;

  useEffect(() => {
    if (scrolledRef.current || !activeStack.length) return undefined;
    const id = activeStack[activeStack.length - 1];
    let attempts = 0;
    let timer;
    const tryScroll = () => {
      if (scrollToExpandId(id)) {
        scrolledRef.current = true;
        return;
      }
      attempts += 1;
      if (attempts < 10) timer = setTimeout(tryScroll, 150);
    };
    timer = setTimeout(tryScroll, 100);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [activeStack]);

  const value = useMemo(() => {
    function toggle(id, expanded) {
      if (apiRef.current) {
        apiRef.current.toggle(id, expanded);
        return;
      }
      setLocalStack((prev) => toggleInStack(prev, id, expanded));
    }

    return {
      stack: activeStack,
      isOpen: (id) => isOpenDerived(activeStack, id),
      toggle,
    };
  }, [activeStack]);

  return React.createElement(ExpandStackContext.Provider, { value }, children);
}

export function useExpandStack() {
  const ctx = useContext(ExpandStackContext);
  if (!ctx) {
    throw new Error("useExpandStack: usar dentro de ExpandStackProvider");
  }
  return ctx;
}
