// src/lib/types.ts

/* ---------------------------------- Statusy --------------------------------- */

export type ProductStatus =
  | "NA_MAGAZYNIE"
  | "SPRZEDANY"
  | "WYCOFANY";

/** Lista statusów wykorzystywana w selektach/validacji */
export const STATUSES: ProductStatus[] = [
  "NA_MAGAZYNIE",
  "SPRZEDANY",
  "WYCOFANY",
];

/* ---------------------------------- Zdjęcia --------------------------------- */

export interface Photo {
  id: string;
  url: string;

  // relacja (opcjonalnie jeśli chcesz mieć w modelu)
  productId?: string;

  // cechy zdjęcia
  isFront: boolean;
  /** rólkę trzymamy luźno; często używane: 'front' | 'back' | 'measure1' | 'measure2' | 'extra' */
  role?: string | null;

  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;

  /** ręczne porządkowanie zdjęć (drag & drop) */
  order?: number | null;

  createdAt?: string | null;
}

/* ---------------------------------- Produkt --------------------------------- */

export interface Product {
  id: string;
  title: string;

  brand: string | null;
  size: string | null;
  condition: string | null;

  status: ProductStatus;

  sku: string | null;

  /** cena w groszach */
  priceCents: number;

  /** wymiary (opcjonalne) */
  dimA: number | null;
  dimB: number | null;
  dimC: number | null;

  notes: string | null;

  photos: Photo[];

  createdAt?: string;
  updatedAt?: string;
}

/* ---------------------------------- Facety ---------------------------------- */

export interface Facets {
  brands: string[];
  sizes: string[];
  conditions: string[];
  statuses: ProductStatus[]; // albo string[] jeśli wolisz mniej restrykcyjnie
}

/* ------------------------------ Odpowiedzi API ------------------------------ */

export interface ListResponse {
  total: number;
  items: Product[];
  /** opcjonalnie — gdy endpoint zwraca facety do filtrów */
  facets?: Partial<Facets>;
}

/* --------------------------------- Statystyki -------------------------------- */

export interface CountByBrand {
  brand: string | null;
  _count: { _all: number };
}

export interface StatsSummary {
  /** łączna liczba produktów o statusie NA_MAGAZYNIE */
  totalOnStock: number;
  /** zliczenia per marka (używane do krótkiego podsumowania) */
  countsByBrand: CountByBrand[];
}
