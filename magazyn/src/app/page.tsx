"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Product, Photo, ProductStatus } from "@/lib/types";
import { STATUSES } from "@/lib/types";

/* ------------------------------- helpers ---------------------------------- */
function cn(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(" ");
}
function pln(cents: number) {
  const v = (cents ?? 0) / 100;
  return v.toLocaleString("pl-PL", { style: "currency", currency: "PLN" });
}
const ALL_LABEL = "— wszystkie —";



/* ---------------------- Multi dropdown z checkboxami ----------------------- */
type MultiProps = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
};
function MultiDropdown({ label, options, selected, onChange }: MultiProps) {
  const allSelected = selected.length === 0;

  const toggle = (opt: string, checked: boolean) => {
    if (checked) onChange([...selected, opt]);
    else onChange(selected.filter((v) => v !== opt));
  };

  return (
    <details className="relative">
      <summary className="rounded-xl border px-3 py-2 cursor-pointer list-none select-none">
        {label}
        {allSelected ? " (wszystkie)" : ` (${selected.length})`}
      </summary>
      <div className="absolute z-20 mt-2 w-72 rounded-xl border bg-white p-2 shadow">
        <label className="flex items-center gap-2 px-2 py-1">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => onChange([])}
          />
          <span>{ALL_LABEL}</span>
        </label>
        <div className="max-h-56 overflow-auto">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 px-2 py-1">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={(e) => toggle(opt, e.target.checked)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      </div>
    </details>
  );
}

/* --------------------------------- page ----------------------------------- */

export default function Page() {
  /* ----------------------------- filtry/state ------------------------------ */
  const [query, setQuery] = useState("");
  const [brands, setBrands] = useState<string[]>([]); // puste = wszystkie
  const [sizes, setSizes] = useState<string[]>([]);   // puste = wszystkie
  const [condition, setCondition] = useState("");
  const [status, setStatus] = useState<ProductStatus | "">("");
  const [sortKey, setSortKey] = useState<"CREATED_DESC" | "CREATED_ASC" | "PRICE_DESC" | "PRICE_ASC">("CREATED_DESC");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(8);

  /* ------------------------------ dane listy ------------------------------- */
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  /* ----------------------------- facet options ----------------------------- */
  const [brandsOptions, setBrandsOptions] = useState<string[]>([]);
  const [sizesOptions, setSizesOptions] = useState<string[]>([]);
  const [conditionOptions, setConditionOptions] = useState<string[]>([]);
  const [statusesOptions, setStatusesOptions] = useState<ProductStatus[]>(STATUSES);

  /* --------------------------- stan edycji/karty --------------------------- */
  const [selected, setSelected] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  /* -------------------------- infinite scroll: ref -------------------------- */
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  /* -------------------------- helpers dla renderu -------------------------- */
  const frontPhoto = (p: Product) =>
    p.photos.find((ph) => ph.isFront) || p.photos[0] || null;

  const buildQuery = useCallback(() => {
    const sp = new URLSearchParams();
    if (query.trim()) sp.set("query", query.trim());
    if (brands.length) sp.set("brands", brands.join(","));
    if (sizes.length) sp.set("sizes", sizes.join(","));
    if (condition.trim()) sp.set("condition", condition.trim());
    if (status) sp.set("status", status);
    sp.set("page", String(page));
    sp.set("limit", String(limit));
    sp.set("sort", sortKey);
    return sp.toString();
  }, [query, brands, sizes, condition, status, page, limit, sortKey]);

  /* -------------------------- pobranie listy (API) ------------------------- */
  const loadProducts = useCallback(
  async (mode: "reset" | "append" = "reset") => {
    try {
      // blokujemy tylko dopinki, nie blokujemy pierwszego "reset"
      if (mode === "append") {
        if (loadingRef.current) return;
        loadingRef.current = true;
      }

      const qs = buildQuery();
      const res = await fetch(`/api/products?${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());

      const data = (await res.json()) as {
        total: number;
        items: Product[];
        facets?: {
          brands?: string[];
          sizes?: string[];
          conditions?: string[];
          statuses?: ProductStatus[];
        };
      };

      // Ustawiamy wszystko "atomowo": nowy stan listy + hasMore wyliczony z nowej tablicy
      setItems((prev) => {
        const next = mode === "reset" ? data.items : [...prev, ...data.items];
        setTotal(data.total);
        setHasMore(next.length < data.total);

        // facety – zawsze aktualizuj z odpowiedzi
        setBrandsOptions(data.facets?.brands ?? []);
        setSizesOptions(data.facets?.sizes ?? []);
        setConditionOptions(data.facets?.conditions ?? []);
        setStatusesOptions(data.facets?.statuses ?? STATUSES);

        return next;
      });
    } catch (e) {
      console.error(e);
      alert("Nie udało się pobrać listy produktów.");
    } finally {
      if (mode === "append") loadingRef.current = false;
    }
  },
  [buildQuery]
);




  /* reset/zmiana filtrów => pobieraj od nowa */
  useEffect(() => {
  if (!sentinelRef.current) return;
  const el = sentinelRef.current;

  const obs = new IntersectionObserver(
    (entries) => {
      const first = entries[0];
      if (first.isIntersecting && hasMore && !loadingRef.current) {
        setPage((p) => p + 1);
      }
    },
    { rootMargin: "300px" }
  );

  obs.observe(el);
  return () => obs.disconnect();
}, [hasMore]);


  /* ------------------------------ infinite scroll -------------------------- */
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "300px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore]);

  /* zmiana page => dociągaj (append) */
  useEffect(() => {
    if (page === 1) return;
    loadProducts("append");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  /* --------------------------- CRUD / Edycja produktu ---------------------- */

  const openProductCard = (p: Product) => setSelected(p);

  const createProduct = useCallback(async () => {
  try {
    setBusy(true);
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Nowy produkt", status: "NA_MAGAZYNIE" }),
    });
    if (!res.ok) throw new Error(await res.text());
    const p = (await res.json()) as Product;

    setPage(1);                   // <--- żeby lista nie była „pusta” na dalszych stronach
    await loadProducts("reset");
    openProductCard(p);
  } catch (e) {
    console.error(e);
    alert("Nie udało się utworzyć produktu.");
  } finally {
    setBusy(false);
  }
}, [loadProducts]);


  const saveProduct = useCallback(
    async (patch: Partial<Product>) => {
      if (!selected) return;
      try {
        setSaving(true);
        const res = await fetch(`/api/products/${selected.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error(await res.text());
        const updated = (await res.json()) as Product;
        setSelected(updated);
        // optymistyczna aktualizacja na liście
        setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      } catch (e) {
        console.error(e);
        alert("Nie udało się zapisać produktu.");
      } finally {
        setSaving(false);
      }
    },
    [selected]
  );

  const deleteProduct = useCallback(
  async (id: string) => {
    if (!confirm("Usunąć produkt?")) return;
    try {
      setBusy(true);
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setSelected(null);
setPage(1);
await loadProducts("reset");

    } catch (e) {
      console.error(e);
      alert("Nie udało się usunąć.");
    } finally {
      setBusy(false);
    }
  },
  [loadProducts]
);


  /* ----------------------------- Zdjęcia produktu -------------------------- */
  // było: const onFilesUpload = useCallback(async (files: FileList) => {
// było: async (files: FileList)
const onFilesUpload = useCallback(
  async (files: File[]) => {
    if (!selected) return;
    try {
      setBusy(true);
      const fd = new FormData();
      for (const f of files) fd.append("photos", f);

      const res = await fetch(`/api/products/${selected.id}/photos`, {
        method: "POST",
        body: fd, // NIE ustawiaj ręcznie Content-Type
      });
      if (!res.ok) throw new Error(await res.text());

      const p = (await res.json()) as Product;
      setSelected(p);
      setItems((prev) => prev.map((x) => (x.id === p.id ? p : x)));
    } catch (e) {
      console.error(e);
      alert("Nie udało się przesłać zdjęć.");
    } finally {
      setBusy(false);
    }
  },
  [selected]
);



  const setFront = useCallback(
    async (photoId: string) => {
      if (!selected) return;
      try {
        const res = await fetch(`/api/products/${selected.id}/photos/${photoId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ isFront: true }),
        });
        if (!res.ok) throw new Error(await res.text());
        const p = (await res.json()) as Product;
        setSelected(p);
        setItems((prev) => prev.map((x) => (x.id === p.id ? p : x)));
      } catch (e) {
        console.error(e);
        alert("Nie udało się ustawić zdjęcia głównego.");
      }
    },
    [selected]
  );

  const removePhoto = useCallback(
    async (photoId: string) => {
      if (!selected) return;
      if (!confirm("Usunąć to zdjęcie?")) return;
      try {
        const res = await fetch(`/api/products/${selected.id}/photos/${photoId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(await res.text());
        const p = (await res.json()) as Product;
        setSelected(p);
        setItems((prev) => prev.map((x) => (x.id === p.id ? p : x)));
      } catch (e) {
        console.error(e);
        alert("Nie udało się usunąć zdjęcia.");
      }
    },
    [selected]
  );

  const dragId = useRef<string | null>(null);
  const onDragStart = (id: string) => () => (dragId.current = id);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDropPhoto = (dropId: string) => async () => {
    if (!selected || !dragId.current) return;
    if (dragId.current === dropId) return;
    const orderedIds = selected.photos
      .slice()
      .sort((a, b) =>
        a.id === dragId.current
          ? -1
          : b.id === dragId.current
          ? 1
          : a.id === dropId
          ? 1
          : b.id === dropId
          ? -1
          : (a.order ?? 0) - (b.order ?? 0)
      )
      .map((ph) => ph.id);

    await reorderPhotos(orderedIds);
    dragId.current = null;
  };

  const reorderPhotos = useCallback(
    async (orderedIds: string[]) => {
      if (!selected) return;
      try {
        const res = await fetch(`/api/products/${selected.id}/photos`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "reorder", order: orderedIds }),
        });
        if (!res.ok) throw new Error(await res.text());
        const p = (await res.json()) as Product;
        setSelected(p);
        setItems((prev) => prev.map((x) => (x.id === p.id ? p : x)));
      } catch (e) {
        console.error(e);
        alert("Nie udało się zmienić kolejności zdjęć.");
      }
    },
    [selected]
  );

  /* --------------------------------- render -------------------------------- */

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Magazyn Odzieży</h1>
        <button
          className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
          onClick={createProduct}
          disabled={busy}
        >
          Dodaj produkt
        </button>
      </div>

      {/* FILTRY */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-7">
        <input
          className="rounded-xl border px-3 py-2"
          placeholder="Szukaj po tytule…"
          value={query}
          onChange={(e) => {
            setPage(1);
            setQuery(e.target.value);
          }}
        />

        {/* MARKI */}
        <MultiDropdown
          label="Marka"
          options={brandsOptions}
          selected={brands}
          onChange={(vals) => {
            setPage(1);
            setBrands(vals);
          }}
        />

        {/* ROZMIARY */}
        <MultiDropdown
          label="Rozmiar"
          options={sizesOptions}
          selected={sizes}
          onChange={(vals) => {
            setPage(1);
            setSizes(vals);
          }}
        />

        {/* STAN */}
        <select
          className="rounded-xl border px-3 py-2"
          value={condition}
          onChange={(e) => {
            setPage(1);
            setCondition(e.target.value);
          }}
        >
          <option value="">Stan (wszystkie)</option>
          {conditionOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* STATUS */}
        <select
          className="rounded-xl border px-3 py-2"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as ProductStatus | "");
          }}
        >
          <option value="">Status (wszystkie)</option>
          {statusesOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* SORT */}
        <select
          className="rounded-xl border px-3 py-2"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as any)}
        >
          <option value="CREATED_DESC">Najnowsze</option>
          <option value="CREATED_ASC">Najstarsze</option>
          <option value="PRICE_DESC">Cena malejąco</option>
          <option value="PRICE_ASC">Cena rosnąco</option>
        </select>

        {/* LIMIT */}
        <select
          className="rounded-xl border px-3 py-2"
          value={limit}
          onChange={(e) => {
            setPage(1);
            setLimit(Number(e.target.value));
          }}
        >
          {[8, 12, 16, 20, 24, 30, 40, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} / strona
            </option>
          ))}
        </select>
      </div>

      {/* „chip-y” z wybranymi markami/rozmiarami (opcjonalnie) */}
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        {brands.length > 0 && (
          <>
            <span className="text-neutral-500">Marki:</span>
            {brands.map((b) => (
              <span key={b} className="rounded-full bg-neutral-100 px-2 py-1">
                {b}
                <button className="ml-1" onClick={() => setBrands(brands.filter((x) => x !== b))}>
                  ×
                </button>
              </span>
            ))}
            <button className="text-emerald-600" onClick={() => setBrands([])}>
              wyczyść
            </button>
          </>
        )}
        {sizes.length > 0 && (
          <>
            <span className="ml-3 text-neutral-500">Rozmiary:</span>
            {sizes.map((s) => (
              <span key={s} className="rounded-full bg-neutral-100 px-2 py-1">
                {s}
                <button className="ml-1" onClick={() => setSizes(sizes.filter((x) => x !== s))}>
                  ×
                </button>
              </span>
            ))}
            <button className="text-emerald-600" onClick={() => setSizes([])}>
              wyczyść
            </button>
          </>
        )}
      </div>

      {/* LISTA + PANEL w tej samej wysokości */}
      <div className="mt-2 flex gap-6 overflow-hidden">
        {/* LISTA */}
        <div className="flex-1 overflow-y-auto pr-1" style={{ height: "calc(100vh - 220px)" }}>
          {items.length === 0 ? (
            <div className="rounded-xl border p-6 text-center text-sm text-neutral-500">
              Brak wyników dla podanych filtrów.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {items.map((p) => {
                  const ph = frontPhoto(p);
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "group cursor-pointer rounded-xl border p-3 transition hover:shadow",
                        selected?.id === p.id && "ring-2 ring-emerald-500"
                      )}
                      onClick={() => openProductCard(p)}
                    >
                      <div className="aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100">
                        {ph ? (
                          <img
                            src={ph.url}
                            alt=""
                            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-neutral-400">
                            Brak zdjęcia
                          </div>
                        )}
                      </div>
                      <div className="mt-3">
                        <div className="line-clamp-2 font-medium">{p.title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                          {p.brand && (
                            <span className="rounded bg-neutral-100 px-2 py-0.5">{p.brand}</span>
                          )}
                          {p.size && (
                            <span className="rounded bg-neutral-100 px-2 py-0.5">{p.size}</span>
                          )}
                          {p.condition && (
                            <span className="rounded bg-neutral-100 px-2 py-0.5">{p.condition}</span>
                          )}
                          <span className="rounded bg-neutral-100 px-2 py-0.5">
                            {p.status.toLowerCase().replaceAll("_", " ")}
                          </span>
                        </div>
                        <div className="mt-2 font-semibold">{pln(p.priceCents)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* sentinel pod listą do infinite scroll */}
              <div ref={sentinelRef} className="h-4" />
            </>
          )}
        </div>

        {/* PANEL EDYCJI */}
        <div className="w-full shrink-0 overflow-y-auto lg:w-[380px]" style={{ height: "calc(100vh - 220px)" }}>
          {!selected ? (
            <div className="rounded-xl border p-6 text-sm text-neutral-500">
              Kliknij kafelek, aby edytować produkt.
            </div>
          ) : (
            <div className="rounded-xl border p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-lg font-semibold">Edycja produktu</div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-lg border px-3 py-1 text-sm"
                    onClick={() => setSelected(null)}
                  >
                    Zamknij
                  </button>
                  <button
                    className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                    onClick={() => deleteProduct(selected.id)}
                    disabled={busy}
                  >
                    Usuń
                  </button>
                </div>
              </div>

              {/* pola edycji */}
              <div className="grid grid-cols-1 gap-3">
                <input
                  className="rounded-lg border px-3 py-2"
                  value={selected.title}
                  onChange={(e) => setSelected({ ...selected, title: e.target.value })}
                  onBlur={() => saveProduct({ title: selected.title })}
                  placeholder="Tytuł"
                />
                <input
                  className="rounded-lg border px-3 py-2"
                  value={selected.brand ?? ""}
                  onChange={(e) => setSelected({ ...selected, brand: e.target.value })}
                  onBlur={() => saveProduct({ brand: selected.brand ?? "" })}
                  placeholder="Marka"
                />
                <input
                  className="rounded-lg border px-3 py-2"
                  value={selected.size ?? ""}
                  onChange={(e) => setSelected({ ...selected, size: e.target.value })}
                  onBlur={() => saveProduct({ size: selected.size ?? "" })}
                  placeholder="Rozmiar"
                />
                <input
                  className="rounded-lg border px-3 py-2"
                  value={selected.condition ?? ""}
                  onChange={(e) => setSelected({ ...selected, condition: e.target.value })}
                  onBlur={() => saveProduct({ condition: selected.condition ?? "" })}
                  placeholder="Stan (np. DOBRY / BARDZO_DOBRY / NOWY)"
                />
                <select
                  className="rounded-lg border px-3 py-2"
                  value={selected.status}
                  onChange={(e) => {
                    const v = e.target.value as ProductStatus;
                    setSelected({ ...selected, status: v });
                    saveProduct({ status: v });
                  }}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-lg border px-3 py-2"
                  value={selected.sku ?? ""}
                  onChange={(e) => setSelected({ ...selected, sku: e.target.value })}
                  onBlur={() => saveProduct({ sku: selected.sku ?? "" })}
                  placeholder="SKU / Kod"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    className="rounded-lg border px-3 py-2"
                    type="number"
                    placeholder="A"
                    value={selected.dimA ?? ""}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        dimA: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    onBlur={() => saveProduct({ dimA: selected.dimA })}
                  />
                  <input
                    className="rounded-lg border px-3 py-2"
                    type="number"
                    placeholder="B"
                    value={selected.dimB ?? ""}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        dimB: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    onBlur={() => saveProduct({ dimB: selected.dimB })}
                  />
                  <input
                    className="rounded-lg border px-3 py-2"
                    type="number"
                    placeholder="C"
                    value={selected.dimC ?? ""}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        dimC: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    onBlur={() => saveProduct({ dimC: selected.dimC })}
                  />
                </div>
                <input
                  className="rounded-lg border px-3 py-2"
                  type="number"
                  placeholder="Cena (zł)"
                  value={Number.isFinite(selected.priceCents) ? selected.priceCents / 100 : 0}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      priceCents: Math.round(Number(e.target.value || 0) * 100),
                    })
                  }
                  onBlur={() => saveProduct({ priceCents: selected.priceCents })}
                />
                <textarea
                  className="min-h-[80px] rounded-lg border px-3 py-2"
                  placeholder="Notatki"
                  value={selected.notes ?? ""}
                  onChange={(e) => setSelected({ ...selected, notes: e.target.value })}
                  onBlur={() => saveProduct({ notes: selected.notes ?? "" })}
                />
              </div>

              {/* Zdjęcia */}
              <div className="mt-6">
                <div className="mb-2 font-medium">Zdjęcia</div>

                
  <label className="mb-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50">
  <input
    type="file"
    multiple
    accept="image/*"
    className="hidden"
    onChange={async (e) => {
      const input = e.currentTarget;
      const list = e.target.files;
      if (!list || list.length === 0) return;

      // KLUCZOWE: robimy KOPIĘ do zwykłej tablicy File,
      // żeby po asynchronii nie zniknęło:
      const files = Array.from(list);

      await onFilesUpload(files);
      input.value = ""; // czyść dopiero po await
    }}
  />
  + Dodaj zdjęcia
</label>



                {selected.photos.length === 0 ? (
                  <div className="rounded-lg border p-4 text-sm text-neutral-500">Brak zdjęć.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {selected.photos
                      .slice()
                      .sort((a, b) =>
                        (a.isFront === b.isFront ? 0 : a.isFront ? -1 : 1) ||
                        (a.order ?? 0) - (b.order ?? 0) ||
                        (new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime())
                      )
                      .map((ph) => (
                        <div
                          key={ph.id}
                          className={cn(
                            "relative overflow-hidden rounded-lg border",
                            ph.isFront && "ring-2 ring-emerald-500"
                          )}
                          draggable
                          onDragStart={onDragStart(ph.id)}
                          onDragOver={onDragOver}
                          onDrop={onDropPhoto(ph.id)}
                          title={ph.role ?? ""}
                        >
                          <img src={ph.url} alt="" className="h-40 w-full object-cover" />
                          <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                            {ph.role ?? ""}{ph.isFront ? " • front" : ""}
                          </div>
                          <div className="absolute right-2 top-2 flex gap-1">
                            {!ph.isFront && (
                              <button
                                className="rounded bg-white/90 px-2 py-0.5 text-xs hover:bg-white"
                                onClick={() => setFront(ph.id)}
                                title="Ustaw jako główne"
                              >
                                ★
                              </button>
                            )}
                            <button
                              className="rounded bg-white/90 px-2 py-0.5 text-xs text-red-600 hover:bg-white"
                              onClick={() => removePhoto(ph.id)}
                              title="Usuń zdjęcie"
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* stopka karty */}
              <div className="mt-6 flex items-center justify-between text-sm text-neutral-500">
                <div>ID: {selected.id}</div>
                <div className="italic">{saving ? "Zapisywanie…" : " "}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
