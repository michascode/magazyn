// src/components/EditPanel.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Product, Photo, ProductStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

type Props = {
  product: Product;
  saving?: boolean;
  busy?: boolean;
  statuses?: ProductStatus[]; // jeśli nie podasz, użyję domyślnych z dołu
  onClose: () => void;
  onDelete: (id: string) => void;
  onPatch: (patch: Partial<Product>) => Promise<void> | void;
  photos: {
    upload: (files: FileList | File[]) => Promise<void> | void;
    setFront: (photoId: string) => Promise<void> | void;
    remove: (photoId: string) => Promise<void> | void;
    reorder: (orderedIds: string[]) => Promise<void> | void;
  };
};

const DEFAULT_STATUSES: ProductStatus[] = [
  "NA_MAGAZYNIE",
  "ZAREZERWOWANY",
  "SPRZEDANY",
];

export default function EditPanel({
  product,
  saving,
  busy,
  statuses = DEFAULT_STATUSES,
  onClose,
  onDelete,
  onPatch,
  photos,
}: Props) {
  // Lokalna kopia do płynnej edycji (jak u Ciebie wcześniej w selected)
  const [form, setForm] = useState<Product>(product);

  useEffect(() => setForm(product), [product]);

  // ------- Helpers
  const pricePLN = useMemo(
    () => (Number.isFinite(form.priceCents) ? form.priceCents / 100 : 0),
    [form.priceCents]
  );

  const setNumberOrNull =
    (key: "dimA" | "dimB" | "dimC") =>
    (v: string) => {
      setForm((p) => ({
        ...p,
        [key]: v === "" ? null : Number(v),
      }));
    };

  const sortPhotos = (arr: Photo[]) =>
    arr
      .slice()
      .sort(
        (a, b) =>
          (a.isFront === b.isFront ? 0 : a.isFront ? -1 : 1) ||
          (a.order ?? 0) - (b.order ?? 0) ||
          (new Date(a.createdAt ?? 0).getTime() -
            new Date(b.createdAt ?? 0).getTime())
      );

  // ------- Drag & Drop reorder
  const dragId = useRef<string | null>(null);
  const onDragStart = (id: string) => () => {
    dragId.current = id;
  };
  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
  };
  const onDrop = (targetId: string) => async (e: React.DragEvent) => {
    e.preventDefault();
    const sourceId = dragId.current;
    dragId.current = null;
    if (!sourceId || sourceId === targetId) return;

    // przelicz nową kolejność po przeciągnięciu
    const list = sortPhotos(form.photos);
    const from = list.findIndex((p) => p.id === sourceId);
    const to = list.findIndex((p) => p.id === targetId);
    if (from < 0 || to < 0) return;
    const next = list.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    // wyślij tylko listę ids we właściwej kolejności
    await photos.reorder(next.map((p) => p.id));
  };

  // ------- Submit helpers (na wzór onBlur z Twojego kodu)
  const patchTitle = async () => onPatch({ title: form.title });
  const patchBrand = async () => onPatch({ brand: form.brand ?? "" });
  const patchSize = async () => onPatch({ size: form.size ?? "" });
  const patchCondition = async () =>
    onPatch({ condition: form.condition ?? "" });
  const patchStatus = async (v: ProductStatus) => onPatch({ status: v });
  const patchSku = async () => onPatch({ sku: form.sku ?? "" });
  const patchDimA = async () => onPatch({ dimA: form.dimA ?? null });
  const patchDimB = async () => onPatch({ dimB: form.dimB ?? null });
  const patchDimC = async () => onPatch({ dimC: form.dimC ?? null });
  const patchNotes = async () => onPatch({ notes: form.notes ?? "" });
  const patchPrice = async () => onPatch({ priceCents: form.priceCents });

  // ------- Render
  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-lg font-semibold">Edycja produktu</div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border px-3 py-1 text-sm"
            onClick={onClose}
          >
            Zamknij
          </button>
          <button
            className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            onClick={() => onDelete(form.id)}
            disabled={!!busy}
          >
            Usuń
          </button>
        </div>
      </div>

      {/* Pola edycji – 1:1 jak wcześniej */}
      <div className="grid grid-cols-1 gap-3">
        <input
          className="rounded-lg border px-3 py-2"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          onBlur={patchTitle}
          placeholder="Tytuł"
        />

        <input
          className="rounded-lg border px-3 py-2"
          value={form.brand ?? ""}
          onChange={(e) => setForm({ ...form, brand: e.target.value })}
          onBlur={patchBrand}
          placeholder="Marka"
        />

        <input
          className="rounded-lg border px-3 py-2"
          value={form.size ?? ""}
          onChange={(e) => setForm({ ...form, size: e.target.value })}
          onBlur={patchSize}
          placeholder="Rozmiar"
        />

        <input
          className="rounded-lg border px-3 py-2"
          value={form.condition ?? ""}
          onChange={(e) => setForm({ ...form, condition: e.target.value })}
          onBlur={patchCondition}
          placeholder="Stan (np. DOBRY / BARDZO_DOBRY / NOWY)"
        />

        <select
          className="rounded-lg border px-3 py-2"
          value={form.status}
          onChange={(e) => {
            const v = e.target.value as ProductStatus;
            setForm({ ...form, status: v });
            patchStatus(v);
          }}
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <input
          className="rounded-lg border px-3 py-2"
          value={form.sku ?? ""}
          onChange={(e) => setForm({ ...form, sku: e.target.value })}
          onBlur={patchSku}
          placeholder="SKU / Kod"
        />

        <div className="grid grid-cols-3 gap-2">
          <input
            className="rounded-lg border px-3 py-2"
            type="number"
            placeholder="A"
            value={form.dimA ?? ""}
            onChange={(e) => setNumberOrNull("dimA")(e.target.value)}
            onBlur={patchDimA}
          />
          <input
            className="rounded-lg border px-3 py-2"
            type="number"
            placeholder="B"
            value={form.dimB ?? ""}
            onChange={(e) => setNumberOrNull("dimB")(e.target.value)}
            onBlur={patchDimB}
          />
          <input
            className="rounded-lg border px-3 py-2"
            type="number"
            placeholder="C"
            value={form.dimC ?? ""}
            onChange={(e) => setNumberOrNull("dimC")(e.target.value)}
            onBlur={patchDimC}
          />
        </div>

        <input
          className="rounded-lg border px-3 py-2"
          type="number"
          placeholder="Cena (zł)"
          value={pricePLN}
          onChange={(e) =>
            setForm({
              ...form,
              priceCents: Math.round(Number(e.target.value || 0) * 100),
            })
          }
          onBlur={patchPrice}
        />

        <textarea
          className="min-h-[80px] rounded-lg border px-3 py-2"
          placeholder="Notatki"
          value={form.notes ?? ""}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          onBlur={patchNotes}
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
            onChange={(e) => e.target.files && photos.upload(e.target.files)}
          />
          + Dodaj zdjęcia
        </label>

        {form.photos.length === 0 ? (
          <div className="rounded-lg border p-4 text-sm text-neutral-500">
            Brak zdjęć.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sortPhotos(form.photos).map((ph) => (
              <div
                key={ph.id}
                className={cn(
                  "relative overflow-hidden rounded-lg border",
                  ph.isFront && "ring-2 ring-emerald-500"
                )}
                draggable
                onDragStart={onDragStart(ph.id)}
                onDragOver={onDragOver}
                onDrop={onDrop(ph.id)}
                title={ph.role}
              >
                <img src={ph.url} alt="" className="h-40 w-full object-cover" />
                <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                  {ph.role}
                  {ph.isFront ? " • front" : ""}
                </div>
                <div className="absolute right-2 top-2 flex gap-1">
                  {!ph.isFront && (
                    <button
                      className="rounded bg-white/90 px-2 py-0.5 text-xs hover:bg-white"
                      onClick={() => photos.setFront(ph.id)}
                      title="Ustaw jako główne"
                    >
                      ★
                    </button>
                  )}
                  <button
                    className="rounded bg-white/90 px-2 py-0.5 text-xs text-red-600 hover:bg-white"
                    onClick={() => photos.remove(ph.id)}
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

      {/* Stopka */}
      <div className="mt-6 flex items-center justify-between text-sm text-neutral-500">
        <div>ID: {form.id}</div>
        <div className="italic">{saving ? "Zapisywanie…" : " "}</div>
      </div>
    </div>
  );
}
