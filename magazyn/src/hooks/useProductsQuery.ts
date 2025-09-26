import { useCallback, useEffect, useState } from "react";
import type { ListResponse, Product, Facets } from "@/lib/types";

type Params = {
  query: string; brand: string; size: string; condition: string; status: string;
  sortKey: string; page: number; limit: number;
};

export function useProductsQuery(params: Params) {
  const [items, setItems]   = useState<Product[]>([]);
  const [total, setTotal]   = useState(0);
  const [facets, setFacets] = useState<Facets>({brands:[],sizes:[],conditions:[],statuses:[]});
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k,v]) => v && sp.set(k, String(v)));
    try {
      const res = await fetch(`/api/products?${sp.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as ListResponse;
      setItems(data.items); setTotal(data.total);
      // server zwraca facets (nazwane u Ciebie „facets”) – jeśli brak, zostaw ostatnie
      if (data.facets) setFacets(data.facets);
    } catch (e: any) {
      setError(e?.message ?? "Load error");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { load(); }, [load]);

  return { items, total, facets, loading, error, reload: load };
}
