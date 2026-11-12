import { searchKabum } from "./kabum";
import { selectOffers } from "./match";
import { searchTerabyte } from "./terabyte";
import type { Offer, SearchResponse, SlotId, StoreId, StoreReport } from "./types";

const CACHE_TTL_MS = 90_000;
const cache = new Map<string, { at: number; body: SearchResponse }>();

type StoreFetcher = {
  id: StoreId;
  label: string;
  search: (query: string) => Promise<Offer[]>;
};

const STORES: StoreFetcher[] = [
  { id: "kabum", label: "KaBuM!", search: searchKabum },
  { id: "terabyte", label: "Terabyte", search: searchTerabyte },
];

function remember(key: string, body: SearchResponse): void {
  cache.set(key, { at: Date.now(), body });
  if (cache.size <= 80) return;
  const oldest = [...cache.entries()].sort((left, right) => left[1].at - right[1].at)[0];
  if (oldest) cache.delete(oldest[0]);
}

export async function searchOffers(query: string, slot: SlotId, fresh: boolean): Promise<SearchResponse> {
  const key = `${slot}|${query.toLocaleLowerCase("pt-BR")}`;
  const cached = cache.get(key);
  if (!fresh && cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.body;

  const settled = await Promise.all(
    STORES.map(async (store): Promise<{ report: StoreReport; offers: Offer[] }> => {
      try {
        const offers = await store.search(query);
        return {
          offers,
          report: { id: store.id, label: store.label, ok: true, message: null, matched: 0 },
        };
      } catch (error) {
        console.error(`${store.id} search failed`, error instanceof Error ? error.message : "unknown");
        return {
          offers: [],
          report: {
            id: store.id,
            label: store.label,
            ok: false,
            message: "não respondeu agora",
            matched: 0,
          },
        };
      }
    }),
  );

  const combined = settled.flatMap((result) => result.offers);
  const selected = selectOffers(combined, query, slot);
  const reports = settled.map((result) => ({
    ...result.report,
    matched: selected.offers.filter((offer) => offer.store === result.report.id).length,
  }));
  const body: SearchResponse = {
    query,
    slot,
    relaxed: selected.relaxed,
    offers: selected.offers,
    stores: reports,
    fetchedAt: new Date().toISOString(),
  };
  if (reports.some((report) => report.ok)) remember(key, body);
  return body;
}
