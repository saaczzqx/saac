import { slotById } from "./slots";
import { fold, hasTerm, tokensOf } from "./text";
import type { Offer, SlotId } from "./types";

const BUNDLES = ["pc gamer", "kit upgrade", "notebook"];

function isBundle(folded: string): boolean {
  if (folded.startsWith("pc ")) return true;
  return BUNDLES.some((term) => hasTerm(folded, term));
}

export function titleMatches(title: string, query: string, slot: SlotId, relaxCategory: boolean): boolean {
  const folded = fold(title);
  const tokens = tokensOf(query);
  if (tokens.length === 0) return false;
  if (!tokens.every((token) => hasTerm(folded, token))) return false;
  if (slot !== "other" && isBundle(folded)) return false;
  if (relaxCategory) return true;
  const rule = slotById(slot).rule;
  if (!rule) return true;
  if (rule.any && !rule.any.some((term) => hasTerm(folded, term))) return false;
  if (rule.none && rule.none.some((term) => hasTerm(folded, term))) return false;
  return true;
}

export function sortOffers(offers: Offer[]): Offer[] {
  return [...offers].sort((left, right) => {
    if (left.available !== right.available) return left.available ? -1 : 1;
    if (left.price !== right.price) return left.price - right.price;
    return left.title.localeCompare(right.title, "pt-BR");
  });
}

export function selectOffers(offers: Offer[], query: string, slot: SlotId): { offers: Offer[]; relaxed: boolean } {
  const strict = sortOffers(offers.filter((offer) => titleMatches(offer.title, query, slot, false)));
  if (strict.length > 0 || slot === "other") {
    return { offers: strict.slice(0, 16), relaxed: false };
  }
  const relaxed = sortOffers(offers.filter((offer) => titleMatches(offer.title, query, slot, true)));
  return { offers: relaxed.slice(0, 16), relaxed: relaxed.length > 0 };
}
