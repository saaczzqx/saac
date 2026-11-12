import { allowRequest } from "@/lib/limit";
import { refreshOffers } from "@/lib/refresh";
import type { RefreshRequestItem, StoreId } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function readItems(payload: unknown): RefreshRequestItem[] {
  if (!payload || typeof payload !== "object" || !("items" in payload)) return [];
  const items = (payload as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as { store?: unknown; id?: unknown; path?: unknown };
    const store = record.store;
    const id = record.id;
    if ((store !== "kabum" && store !== "terabyte") || typeof id !== "string") return [];
    if (!/^\d{1,12}$/.test(id)) return [];
    const path = typeof record.path === "string" ? record.path : null;
    return [{ store: store as StoreId, id, path }];
  });
}

export async function POST(request: NextRequest) {
  if (!allowRequest()) {
    return NextResponse.json(
      { error: "Muitas buscas seguidas. Espere um instante e tente de novo." },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const items = readItems(payload);
  if (items.length === 0) {
    return NextResponse.json({ error: "Nenhuma peça para atualizar." }, { status: 400 });
  }

  const body = await refreshOffers(items);
  return NextResponse.json(body);
}
