import { refreshKabum } from "./kabum";
import { refreshTerabyte } from "./terabyte";
import type { RefreshRequestItem, RefreshResponse } from "./types";

export async function refreshOffers(items: RefreshRequestItem[]): Promise<RefreshResponse> {
  const unique = new Map<string, RefreshRequestItem>();
  for (const item of items) {
    if ((item.store !== "kabum" && item.store !== "terabyte") || !/^\d{1,12}$/.test(item.id)) continue;
    unique.set(`${item.store}:${item.id}`, item);
  }
  const pending = [...unique.values()].slice(0, 12);
  const settled = await Promise.all(
    pending.map(async (item) => {
      try {
        const offer =
          item.store === "kabum" ? await refreshKabum(item.id) : await refreshTerabyte(item.id, item.path);
        return { item, offer };
      } catch (error) {
        console.error(`${item.store} refresh failed`, error instanceof Error ? error.message : "unknown");
        return { item, offer: null };
      }
    }),
  );
  return {
    offers: settled.flatMap((result) => (result.offer ? [result.offer] : [])),
    missing: settled.filter((result) => !result.offer).map((result) => result.item),
    fetchedAt: new Date().toISOString(),
  };
}
