import { memo } from "react";
import { cn } from "@/lib/cn";
import { zł } from "@/lib/money";
import type { Product } from "@/lib/types";

function frontPhoto(p: Product) {
  return p.photos.find(ph => ph.isFront) || p.photos[0] || null;
}

type Props = {
  product: Product;
  selectedId?: string;
  onClick: (p: Product) => void;
};

export const ProductCard = memo(({ product, selectedId, onClick }: Props) => {
  const ph = frontPhoto(product);
  return (
    <div
      className={cn(
        "group cursor-pointer rounded-xl border p-3 transition hover:shadow",
        selectedId === product.id && "ring-2 ring-emerald-500"
      )}
      onClick={() => onClick(product)}
    >
      <div className="aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100">
        {ph ? (
          <img src={ph.url} alt="" loading="lazy"
               className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-400">Brak zdjęcia</div>
        )}
      </div>
      <div className="mt-3">
        <div className="line-clamp-2 font-medium">{product.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
          {product.brand && <span className="rounded bg-neutral-100 px-2 py-0.5">{product.brand}</span>}
          {product.size && <span className="rounded bg-neutral-100 px-2 py-0.5">{product.size}</span>}
          {product.condition && <span className="rounded bg-neutral-100 px-2 py-0.5">{product.condition}</span>}
          <span className="rounded bg-neutral-100 px-2 py-0.5">
            {product.status.toLowerCase().replaceAll("_"," ")}
          </span>
        </div>
        <div className="mt-2 font-semibold">{zł(product.priceCents)}</div>
      </div>
    </div>
  );
});
