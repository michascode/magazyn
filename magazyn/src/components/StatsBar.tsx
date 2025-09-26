import React from "react";

type Stats = {
  countsByBrand: { brand: string | null; _count: { _all: number } }[];
  countsByStatus: { status: string; _count: { _all: number } }[];
  avgPriceByBrand: { brand: string | null; _avg: { priceCents: number | null } }[];
  totalOnStock: number;
};

export default function StatsBar({ data }: { data: Stats | null }) {
  if (!data) return null;
  return (
    <div className="mb-4 rounded-xl border p-3 text-sm">
      <div className="flex flex-wrap gap-4">
        <div><b>Na magazynie:</b> {data.totalOnStock}</div>
        <div className="hidden md:block">•</div>
        <div className="flex flex-wrap gap-2">
          <b>Marki:</b>
          {data.countsByBrand.slice(0,6).map(b => (
            <span key={b.brand ?? '—'} className="rounded bg-neutral-100 px-2 py-0.5">
              {(b.brand ?? "—")}: {b._count._all}
            </span>
          ))}
          {data.countsByBrand.length > 6 && <span className="text-neutral-500">(+{data.countsByBrand.length - 6})</span>}
        </div>
      </div>
    </div>
  );
}
