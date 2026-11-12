import { fetchStore } from "./http";
import { roundMoney } from "./text";
import type { Offer } from "./types";
import { imageUrl, productUrl } from "./urls";

type KabumProduct = {
  id?: string | number;
  attributes?: {
    title?: string;
    price?: number;
    old_price?: number;
    price_with_discount?: number;
    available?: boolean;
    stock?: number;
    product_link?: string;
    photos?: { m?: string[]; g?: string[] };
    max_installment?: string;
  };
};

const SEARCH_URL = "https://servicespub.prod.api.aws.grupokabum.com.br/catalog/v2/products";

function cashPrice(product: KabumProduct): number | null {
  const attributes = product.attributes ?? {};
  const price = roundMoney(Number(attributes.price ?? 0));
  const discounted = roundMoney(Number(attributes.price_with_discount ?? 0));
  if (discounted && (!price || discounted <= price)) return discounted;
  return price;
}

export function mapKabumProduct(product: KabumProduct): Offer | null {
  const attributes = product.attributes;
  const id = String(product.id ?? "");
  const title = attributes?.title?.trim() ?? "";
  const price = cashPrice(product);
  if (!/^\d{1,12}$/.test(id) || !title || !price) return null;
  const slug = attributes?.product_link?.replace(/^\/+|\/+$/g, "") ?? "";
  const url = productUrl(
    slug
      ? `https://www.kabum.com.br/produto/${id}/${slug}`
      : `https://www.kabum.com.br/produto/${id}`,
  );
  if (!url) return null;
  const photo = attributes?.photos?.m?.[0] ?? attributes?.photos?.g?.[0] ?? null;
  const listCandidate = roundMoney(Number(attributes?.old_price || attributes?.price || 0));
  const stock = attributes?.stock;
  return {
    store: "kabum",
    storeLabel: "KaBuM!",
    id,
    title,
    price,
    listPrice: listCandidate && listCandidate > price ? listCandidate : null,
    url,
    path: null,
    image: imageUrl(photo),
    available: attributes?.available !== false && stock !== 0,
    installment: attributes?.max_installment?.trim() || null,
  };
}

function productsFromPayload(payload: unknown): KabumProduct[] {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as { data?: unknown; attributes?: unknown };
  if (Array.isArray(record.data)) return record.data as KabumProduct[];
  if (record.attributes) return [payload as KabumProduct];
  if (record.data && typeof record.data === "object" && "attributes" in record.data) {
    return [record.data as KabumProduct];
  }
  return [];
}

async function loadKabum(url: string): Promise<KabumProduct[]> {
  const body = await fetchStore(url, "application/vnd.api+json", "grupokabum.com.br");
  return productsFromPayload(JSON.parse(body) as unknown);
}

export async function searchKabum(query: string): Promise<Offer[]> {
  const url = `${SEARCH_URL}?query=${encodeURIComponent(query)}&page_number=1&page_size=60`;
  const products = await loadKabum(url);
  const offers: Offer[] = [];
  for (const product of products) {
    const offer = mapKabumProduct(product);
    if (offer) offers.push(offer);
  }
  return offers;
}

export async function refreshKabum(id: string): Promise<Offer | null> {
  if (!/^\d{1,12}$/.test(id)) return null;
  const products = await loadKabum(`${SEARCH_URL}/${id}`);
  return products[0] ? mapKabumProduct(products[0]) : null;
}
