const LINK_HOSTS = new Set([
  "www.kabum.com.br",
  "kabum.com.br",
  "www.terabyteshop.com.br",
  "terabyteshop.com.br",
]);

const IMAGE_HOSTS = new Set([
  "images.kabum.com.br",
  "images2.kabum.com.br",
  "images3.kabum.com.br",
  "images4.kabum.com.br",
  "img.terabyteshop.com.br",
  "www.terabyteshop.com.br",
]);

export function httpsUrl(value: string | null | undefined, hosts: Set<string>): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (!hosts.has(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function productUrl(value: string | null | undefined): string | null {
  return httpsUrl(value, LINK_HOSTS);
}

export function imageUrl(value: string | null | undefined): string | null {
  return httpsUrl(value, IMAGE_HOSTS);
}
