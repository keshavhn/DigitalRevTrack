import { useEffect, useState } from "react";

import { InputStore, loadLastSaved, loadStore } from "@/lib/dataStore";

export function useRevenueSnapshot() {
  const [store, setStore] = useState<InputStore | null>(() => loadStore());
  const [lastSaved, setLastSaved] = useState<string | null>(() => loadLastSaved());

  useEffect(() => {
    function refreshSnapshot() {
      if (document.hidden) {
        return;
      }

      setStore(loadStore());
      setLastSaved(loadLastSaved());
    }

    document.addEventListener("visibilitychange", refreshSnapshot);
    window.addEventListener("focus", refreshSnapshot);

    return () => {
      document.removeEventListener("visibilitychange", refreshSnapshot);
      window.removeEventListener("focus", refreshSnapshot);
    };
  }, []);

  return { store, lastSaved };
}
