import { fetchStore } from "./http";
import { decodeHtml, parseBrl, stripTags } from "./text";
import type { Offer } from "./types";
import { imageUrl, productUrl } from "./urls";

const HOST = "https://www.terabyteshop.com.br";

function offerFromCard(attributes: string, body: string): Offer | null {
  const href = body.match(/href="(\/produto\/(\d{1,12})\/[a-z0-9-]{1,200})"/i);
  const id = href?.[2];
  const path = href?.[1] ?? null;
  const price = parseBrl(attributes.match(/data-tss-price="([^"]+)"/)?.[1] ?? "");
  const title = decodeHtml(
    body.match(/class="product-item__name"[^>]*title="([^"]+)"/)?.[1] ??
      body.match(/<h2>([\s\S]*?)<\/h2>/)?.[1] ??
      "",
  ).trim();
  if (!id || !path || !price || !title) return null;
  const url = productUrl(`${HOST}${path}`);
  if (!url) return null;
  const imageSource = body.match(/<img[^>]+src="(https?:\/\/[^"]+)"/)?.[1] ?? null;
  const stock = attributes.match(/data-tss-estoque="(\d+)"/)?.[1];
  const installment = stripTags(body.match(/product-item__juros">([\s\S]*?)<\/div>/)?.[1] ?? "");
  const oldPrice = parseBrl(body.match(/product-item__old-price[\s\S]*?<span>([\s\S]*?)<\/span>/)?.[1] ?? "");
  return {
    store: "terabyte",
    storeLabel: "Terabyte",
    id,
    title,
    price,
    listPrice: oldPrice && oldPrice > price ? oldPrice : null,
    url,
    path,
    image: imageUrl(imageSource),
    available: stock !== "0",
    installment: installment || null,
  };
}

export function parseTerabyteSearch(html: string): Offer[] {
  const offers: Offer[] = [];
  const pattern = /<div class="product-item"([^>]*)>([\s\S]*?)<div class="product-item__btn"/g;
  for (const match of html.matchAll(pattern)) {
    const offer = offerFromCard(match[1] ?? "", match[2] ?? "");
    if (offer) offers.push(offer);
    if (offers.length >= 80) break;
  }
  return offers;
}

export async function searchTerabyte(query: string): Promise<Offer[]> {
  const html = await fetchStore(
    `${HOST}/busca?str=${encodeURIComponent(query)}`,
    "text/html",
    "terabyteshop.com.br",
  );
  if (html.length < 2000) throw new Error("A Terabyte devolveu uma página incompleta");
  return parseTerabyteSearch(html);
}

type ProductLd = {
  "@type"?: string | string[];
  name?: string;
  image?: string | string[];
  offers?: {
    url?: string;
    price?: string | number;
    availability?: string;
  };
};

function asProduct(value: ProductLd): boolean {
  const kind = value["@type"];
  return kind === "Product" || (Array.isArray(kind) && kind.includes("Product"));
}

export function parseTerabyteProduct(html: string, id: string, path: string): Offer | null {
  const scripts = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  for (const script of scripts) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(script[1] ?? "");
    } catch {
      continue;
    }
    const product = parsed as ProductLd;
    if (!asProduct(product)) continue;
    const price = parseBrl(String(product.offers?.price ?? ""));
    const title = (product.name ?? "").replace(/\s+\|\s+Terabyte\s*$/i, "").trim();
    const url = productUrl(product.offers?.url ?? `${HOST}/produto/${id}`);
    if (!price || !title || !url) return null;
    const image = Array.isArray(product.image) ? product.image[0] : product.image;
    const availability = product.offers?.availability ?? "";
    return {
      store: "terabyte",
      storeLabel: "Terabyte",
      id,
      title,
      price,
      listPrice: null,
      url,
      path,
      image: imageUrl(image),
      available: !/OutOfStock/i.test(availability),
      installment: null,
    };
  }
  return null;
}

export function terabyteProductUrl(id: string, path: string | null | undefined): string | null {
  if (!path || !new RegExp(`^/produto/${id}/[a-z0-9-]{1,200}$`, "i").test(path)) return null;
  return `${HOST}${path}`;
}

export async function refreshTerabyte(id: string, path: string | null | undefined): Promise<Offer | null> {
  if (!path) return null;
  const url = terabyteProductUrl(id, path);
  if (!url) return null;
  const html = await fetchStore(url, "text/html", "terabyteshop.com.br");
  return parseTerabyteProduct(html, id, path);
}
