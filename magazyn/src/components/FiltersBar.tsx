import type { Facets } from "@/lib/types";

type Props = {
  values: {
    query: string; brand: string; size: string; condition: string; status: string;
    sortKey: string; limit: number;
  };
  facets: Facets;
  onChange: (patch: Partial<Props["values"]>) => void;
};

export function FiltersBar({ values, facets, onChange }: Props) {
  const { query, brand, size, condition, status, sortKey, limit } = values;
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-7">
      <input className="rounded-xl border px-3 py-2" placeholder="Szukaj po tytule…"
             value={query} onChange={e => onChange({ query: e.target.value })} />
      <select className="rounded-xl border px-3 py-2" value={brand}
              onChange={e => onChange({ brand: e.target.value })}>
        <option value="">Marka (wszystkie)</option>
        {facets.brands.map(b => <option key={b} value={b}>{b}</option>)}
      </select>
      <select className="rounded-xl border px-3 py-2" value={size}
              onChange={e => onChange({ size: e.target.value })}>
        <option value="">Rozmiar (wszystkie)</option>
        {facets.sizes.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select className="rounded-xl border px-3 py-2" value={condition}
              onChange={e => onChange({ condition: e.target.value })}>
        <option value="">Stan (wszystkie)</option>
        {facets.conditions.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <select className="rounded-xl border px-3 py-2" value={status}
              onChange={e => onChange({ status: e.target.value })}>
        <option value="">Status (wszystkie)</option>
        {facets.statuses.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select className="rounded-xl border px-3 py-2" value={sortKey}
              onChange={e => onChange({ sortKey: e.target.value })}>
        <option value="CREATED_DESC">Najnowsze</option>
        <option value="CREATED_ASC">Najstarsze</option>
        <option value="PRICE_DESC">Cena malejąco</option>
        <option value="PRICE_ASC">Cena rosnąco</option>
      </select>
      <select className="rounded-xl border px-3 py-2" value={limit}
              onChange={e => onChange({ limit: Number(e.target.value) })}>
        {[8,12,16,20,24,30,40,50,100].map(n => <option key={n} value={n}>{n} / strona</option>)}
      </select>
    </div>
  );
}
