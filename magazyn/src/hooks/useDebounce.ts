import { useEffect, useRef } from "react";

export function useDebounce(cb: () => void, deps: any[], delay = 300) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(cb, delay);
    return () => { if (t.current) clearTimeout(t.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
